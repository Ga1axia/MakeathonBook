import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef, type RefObject } from 'react'
import * as THREE from 'three'
import type { SpeedTelemetry } from '../components/Speedometer'
import { CAMERA_RIG, type PageScrollState } from './bookLayout'
import { DriveController, type DriveState } from './DriveController'
import { LowPolyCar } from './LowPolyCar'
import { buildLineLayout } from './lineLayout'
import { SwirlPortal } from './SwirlPortal'

export type DriveModeProps = {
  text: string
  driveRef: RefObject<DriveState>
  scrollRef: RefObject<PageScrollState>
  /** Set to a line index to request a portal jump; cleared after handling */
  jumpRequestRef?: RefObject<number | null>
  onLineIndexChange?: (lineIndex: number) => void
  cruiseMph: number
  telemetryRef: RefObject<SpeedTelemetry>
}

type KeyFlags = {
  forward: boolean
  reverse: boolean
  boost: boolean
}

const DOUBLE_TAP_MS = 280

/** Only block keys when the user is actually typing text — not sliders/buttons. */
function isTextEntryTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true
  if (target instanceof HTMLTextAreaElement) return true
  if (target instanceof HTMLSelectElement) return true
  if (target instanceof HTMLInputElement) {
    const type = (target.type || 'text').toLowerCase()
    return (
      type === 'text' ||
      type === 'search' ||
      type === 'email' ||
      type === 'password' ||
      type === 'url' ||
      type === 'tel' ||
      type === 'number'
    )
  }
  return false
}

function keyToMove(code: string, key: string): 'forward' | 'reverse' | null {
  switch (code) {
    case 'KeyW':
    case 'KeyD':
    case 'ArrowUp':
    case 'ArrowRight':
      return 'forward'
    case 'KeyS':
    case 'KeyA':
    case 'ArrowDown':
    case 'ArrowLeft':
      return 'reverse'
    default:
      break
  }

  switch (key.toLowerCase()) {
    case 'w':
    case 'd':
    case 'arrowup':
    case 'arrowright':
      return 'forward'
    case 's':
    case 'a':
    case 'arrowdown':
    case 'arrowleft':
      return 'reverse'
    default:
      return null
  }
}

function isBoostTapKey(code: string, key: string): boolean {
  return code === 'KeyW' || key.toLowerCase() === 'w' || code === 'ArrowUp'
}

/**
 * Player-steered car under each line.
 * W/↑/D/→ drive forward; S/↓/A/← reverse. Double-tap W to boost.
 */
export function DriveMode({
  text,
  driveRef,
  scrollRef,
  jumpRequestRef,
  onLineIndexChange,
  cruiseMph,
  telemetryRef,
}: DriveModeProps) {
  const controller = useMemo(() => new DriveController(), [])
  const carGroup = useRef<THREE.Group>(null)
  const endPortal = useRef<THREE.Group>(null)
  const startPortal = useRef<THREE.Group>(null)
  const keysRef = useRef<KeyFlags>({
    forward: false,
    reverse: false,
    boost: false,
  })
  const lastWTapRef = useRef(0)
  const lastReportedLine = useRef(-1)
  const onLineIndexChangeRef = useRef(onLineIndexChange)
  onLineIndexChangeRef.current = onLineIndexChange

  const layout = useMemo(() => buildLineLayout(text), [text])

  useEffect(() => {
    controller.setCruiseMph(cruiseMph)
  }, [controller, cruiseMph])

  useEffect(() => {
    controller.setLayout(layout)
    controller.setActive(true)
    if (driveRef.current) Object.assign(driveRef.current, controller.state)

    const state = controller.state
    const laneY = state.y - layout.ribbonHeight / 2 - layout.gap / 2
    if (carGroup.current) {
      carGroup.current.position.set(state.x, laneY, 0.04)
      carGroup.current.scale.setScalar(1)
      carGroup.current.visible = true
    }
  }, [controller, layout, driveRef])

  useEffect(() => {
    return () => {
      controller.setActive(false)
      keysRef.current = { forward: false, reverse: false, boost: false }
    }
  }, [controller])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return
      if (isTextEntryTarget(event.target)) return

      const move = keyToMove(event.code, event.key)
      if (!move) return

      event.preventDefault()

      if (move === 'forward') {
        if (!event.repeat && isBoostTapKey(event.code, event.key)) {
          const now = performance.now()
          if (now - lastWTapRef.current <= DOUBLE_TAP_MS) {
            keysRef.current.boost = true
          }
          lastWTapRef.current = now
        }
        keysRef.current.forward = true
        return
      }

      keysRef.current.reverse = true
      keysRef.current.boost = false
    }

    const onKeyUp = (event: KeyboardEvent) => {
      const move = keyToMove(event.code, event.key)
      if (!move) return
      event.preventDefault()

      if (move === 'forward') {
        // Only clear forward if no other forward key is still held — tracked simply:
        // any forward keyup clears; next keydown re-arms. Good enough for W/D/arrows.
        keysRef.current.forward = false
        if (isBoostTapKey(event.code, event.key)) {
          keysRef.current.boost = false
        }
        return
      }

      keysRef.current.reverse = false
    }

    const clearKeys = () => {
      keysRef.current = { forward: false, reverse: false, boost: false }
    }

    window.addEventListener('keydown', onKeyDown, true)
    window.addEventListener('keyup', onKeyUp, true)
    window.addEventListener('blur', clearKeys)
    return () => {
      window.removeEventListener('keydown', onKeyDown, true)
      window.removeEventListener('keyup', onKeyUp, true)
      window.removeEventListener('blur', clearKeys)
    }
  }, [])

  useFrame((_, delta) => {
    if (jumpRequestRef && jumpRequestRef.current !== null) {
      controller.jumpToLine(jumpRequestRef.current)
      jumpRequestRef.current = null
    }

    controller.ensureActive()
    controller.setCruiseMph(cruiseMph)

    const keys = keysRef.current
    let moveX = 0
    if (keys.forward) moveX += 1
    if (keys.reverse) moveX -= 1

    controller.setInput({ moveX, boost: keys.boost })
    const state = controller.update(delta)
    if (driveRef.current) Object.assign(driveRef.current, state)

    if (telemetryRef.current) {
      telemetryRef.current.mph = state.speedMph
      telemetryRef.current.cruiseMph = state.cruiseMph
      telemetryRef.current.boosting = state.boosting
    }

    if (state.lineIndex !== lastReportedLine.current) {
      lastReportedLine.current = state.lineIndex
      onLineIndexChangeRef.current?.(state.lineIndex)
    }

    const laneY = state.y - layout.ribbonHeight / 2 - layout.gap / 2

    if (scrollRef.current) {
      const halfFov = THREE.MathUtils.degToRad(CAMERA_RIG.fov * 0.5)
      const halfHeight = CAMERA_RIG.distance * Math.tan(halfFov)
      const ndcY = 1 - 2 * CAMERA_RIG.driveCarScreenY
      scrollRef.current.targetY = laneY - ndcY * halfHeight
    }

    if (carGroup.current) {
      carGroup.current.position.set(state.x, laneY, 0.04)
      carGroup.current.scale.setScalar(Math.max(0.001, state.carScale))
      carGroup.current.rotation.z = state.facing < 0 ? Math.PI : 0
      carGroup.current.visible = state.carScale > 0.02
    }

    const half = layout.halfWidth
    if (endPortal.current) {
      endPortal.current.position.set(half + 0.06, laneY, 0.04)
      endPortal.current.visible = true
    }
    if (startPortal.current) {
      startPortal.current.position.set(-half - 0.06, laneY, 0.04)
      startPortal.current.visible = true
    }
  })

  return (
    <group>
      <group ref={carGroup} visible>
        <LowPolyCar />
      </group>

      <group ref={endPortal}>
        <SwirlPortal radius={0.15} />
      </group>
      <group ref={startPortal}>
        <SwirlPortal radius={0.15} />
      </group>
    </group>
  )
}
