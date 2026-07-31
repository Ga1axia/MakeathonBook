import {
  BOOK_ANGLE_LIMITS,
  CAMERA_ANGLE_LIMITS,
  DEFAULT_BOOK_ANGLES,
  DEFAULT_CAMERA_ANGLE,
  type BookAngles,
} from '../ribbon/bookLayout'

type BookAngleControlsProps = {
  value: BookAngles
  onChange: (angles: BookAngles) => void
  cameraAngle: number
  onCameraAngleChange: (angle: number) => void
}

const SLIDERS: {
  key: keyof BookAngles
  label: string
}[] = [
  { key: 'tilt', label: 'Tilt' },
  { key: 'turn', label: 'Turn' },
  { key: 'roll', label: 'Roll' },
]

/**
 * Page orientation + camera elevation controls.
 */
export function BookAngleControls({
  value,
  onChange,
  cameraAngle,
  onCameraAngleChange,
}: BookAngleControlsProps) {
  return (
    <div className="book-angle-controls">
      <div className="book-angle-controls__row">
        <p className="reader-settings__label">View</p>
        <button
          type="button"
          className="book-angle-controls__reset"
          onClick={() => {
            onChange({ ...DEFAULT_BOOK_ANGLES })
            onCameraAngleChange(DEFAULT_CAMERA_ANGLE)
          }}
        >
          Reset
        </button>
      </div>

      <label className="book-angle-controls__slider">
        <span className="book-angle-controls__meta">
          <span>Camera</span>
          <span>{cameraAngle}°</span>
        </span>
        <input
          type="range"
          min={CAMERA_ANGLE_LIMITS.min}
          max={CAMERA_ANGLE_LIMITS.max}
          step={1}
          value={cameraAngle}
          onChange={(event) => onCameraAngleChange(Number(event.target.value))}
        />
      </label>

      <p className="reader-settings__label">Page angle</p>
      {SLIDERS.map(({ key, label }) => {
        const limits = BOOK_ANGLE_LIMITS[key]
        return (
          <label key={key} className="book-angle-controls__slider">
            <span className="book-angle-controls__meta">
              <span>{label}</span>
              <span>{value[key]}°</span>
            </span>
            <input
              type="range"
              min={limits.min}
              max={limits.max}
              step={1}
              value={value[key]}
              onChange={(event) =>
                onChange({ ...value, [key]: Number(event.target.value) })
              }
            />
          </label>
        )
      })}
    </div>
  )
}
