import { useEffect, useMemo, useRef, type RefObject } from 'react'
import {
  CRUISE_SPEED_LIMITS,
  SPEED_DIAL_MAX_MPH,
} from '../ribbon/driveSpeed'

export type SpeedTelemetry = {
  mph: number
  cruiseMph: number
  boosting: boolean
}

type SpeedometerProps = {
  telemetryRef: RefObject<SpeedTelemetry>
  cruiseMph: number
  onCruiseChange: (mph: number) => void
}

const START_ANGLE = (-210 * Math.PI) / 180
const END_ANGLE = (30 * Math.PI) / 180
const CX = 100
const CY = 108
const R = 78

function mphToAngle(mph: number): number {
  const t = Math.min(1, Math.max(0, mph / SPEED_DIAL_MAX_MPH))
  return START_ANGLE + t * (END_ANGLE - START_ANGLE)
}

function polar(angle: number, radius: number) {
  return {
    x: CX + Math.cos(angle) * radius,
    y: CY + Math.sin(angle) * radius,
  }
}

/**
 * Bottom-center instrument cluster — full dial, needle, and MPH readout.
 * Cruise can be nudged from the dial; live speed is read from a shared ref.
 */
export function Speedometer({
  telemetryRef,
  cruiseMph,
  onCruiseChange,
}: SpeedometerProps) {
  const needleRef = useRef<SVGLineElement>(null)
  const valueRef = useRef<HTMLSpanElement>(null)
  const unitRef = useRef<HTMLSpanElement>(null)
  const boostRef = useRef<HTMLSpanElement>(null)
  const cruiseMarkRef = useRef<SVGLineElement>(null)

  const ticks = useMemo(() => {
    const marks: { x1: number; y1: number; x2: number; y2: number; major: boolean; label?: string; lx: number; ly: number }[] = []
    for (let mph = 0; mph <= SPEED_DIAL_MAX_MPH; mph += 5) {
      const major = mph % 20 === 0
      const angle = mphToAngle(mph)
      const outer = polar(angle, R)
      const inner = polar(angle, R - (major ? 12 : 7))
      const labelPos = polar(angle, R - 24)
      marks.push({
        x1: inner.x,
        y1: inner.y,
        x2: outer.x,
        y2: outer.y,
        major,
        label: major ? String(mph) : undefined,
        lx: labelPos.x,
        ly: labelPos.y,
      })
    }
    return marks
  }, [])

  const arcPath = useMemo(() => {
    const a0 = polar(START_ANGLE, R)
    const a1 = polar(END_ANGLE, R)
    const large = END_ANGLE - START_ANGLE > Math.PI ? 1 : 0
    return `M ${a0.x} ${a0.y} A ${R} ${R} 0 ${large} 1 ${a1.x} ${a1.y}`
  }, [])

  useEffect(() => {
    let frame = 0
    const tick = () => {
      const telemetry = telemetryRef.current
      const mph = telemetry?.mph ?? 0
      const angle = mphToAngle(mph)
      const tip = polar(angle, R - 16)
      const hub = polar(angle, 10)

      if (needleRef.current) {
        needleRef.current.setAttribute('x1', String(hub.x))
        needleRef.current.setAttribute('y1', String(hub.y))
        needleRef.current.setAttribute('x2', String(tip.x))
        needleRef.current.setAttribute('y2', String(tip.y))
      }

      if (valueRef.current) {
        valueRef.current.textContent = String(Math.round(mph))
      }

      if (boostRef.current) {
        boostRef.current.hidden = !telemetry?.boosting
      }

      const cruiseAngle = mphToAngle(telemetry?.cruiseMph ?? cruiseMph)
      const c0 = polar(cruiseAngle, R - 4)
      const c1 = polar(cruiseAngle, R + 6)
      if (cruiseMarkRef.current) {
        cruiseMarkRef.current.setAttribute('x1', String(c0.x))
        cruiseMarkRef.current.setAttribute('y1', String(c0.y))
        cruiseMarkRef.current.setAttribute('x2', String(c1.x))
        cruiseMarkRef.current.setAttribute('y2', String(c1.y))
      }

      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [cruiseMph, telemetryRef])

  return (
    <div className="speedometer" aria-label="Speedometer">
      <div className="speedometer__dial">
        <svg
          className="speedometer__svg"
          viewBox="0 0 200 140"
          role="img"
          aria-hidden="true"
        >
          <path className="speedometer__arc" d={arcPath} />
          {ticks.map((tick) => (
            <g key={`${tick.x2}-${tick.y2}`}>
              <line
                className={
                  tick.major
                    ? 'speedometer__tick speedometer__tick--major'
                    : 'speedometer__tick'
                }
                x1={tick.x1}
                y1={tick.y1}
                x2={tick.x2}
                y2={tick.y2}
              />
              {tick.label ? (
                <text
                  className="speedometer__tick-label"
                  x={tick.lx}
                  y={tick.ly}
                  textAnchor="middle"
                  dominantBaseline="middle"
                >
                  {tick.label}
                </text>
              ) : null}
            </g>
          ))}
          <line
            ref={cruiseMarkRef}
            className="speedometer__cruise-mark"
            x1={CX}
            y1={CY}
            x2={CX}
            y2={CY}
          />
          <line
            ref={needleRef}
            className="speedometer__needle"
            x1={CX}
            y1={CY}
            x2={CX}
            y2={CY - 50}
          />
          <circle className="speedometer__hub" cx={CX} cy={CY} r={5} />
        </svg>

        <div className="speedometer__readout">
          <span ref={valueRef} className="speedometer__mph">
            0
          </span>
          <span ref={unitRef} className="speedometer__unit">
            MPH
          </span>
          <span ref={boostRef} className="speedometer__boost" hidden>
            BOOST
          </span>
        </div>
      </div>

      <div className="speedometer__cruise">
        <label className="speedometer__cruise-label" htmlFor="cruise-speed">
          Cruise
        </label>
        <input
          id="cruise-speed"
          className="speedometer__cruise-slider"
          type="range"
          min={CRUISE_SPEED_LIMITS.min}
          max={CRUISE_SPEED_LIMITS.max}
          step={CRUISE_SPEED_LIMITS.step}
          value={cruiseMph}
          onChange={(event) => onCruiseChange(Number(event.target.value))}
          aria-valuetext={`${cruiseMph} miles per hour`}
        />
        <span className="speedometer__cruise-value">{cruiseMph}</span>
      </div>
    </div>
  )
}
