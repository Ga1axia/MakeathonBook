import { BookAngleControls } from './BookAngleControls'
import type { BookAngles } from '../ribbon/bookLayout'
import { CRUISE_SPEED_LIMITS } from '../ribbon/driveSpeed'

type ReaderSettingsProps = {
  id?: string
  open: boolean
  onClose: () => void
  title: string
  onBack: () => void
  angles: BookAngles
  onAnglesChange: (angles: BookAngles) => void
  cameraAngle: number
  onCameraAngleChange: (angle: number) => void
  cruiseMph: number
  onCruiseChange: (mph: number) => void
  text: string
  onTextChange: (text: string) => void
}

/**
 * Slide-over reader controls — only visible when opened from Menu.
 */
export function ReaderSettings({
  id,
  open,
  onClose,
  title,
  onBack,
  angles,
  onAnglesChange,
  cameraAngle,
  onCameraAngleChange,
  cruiseMph,
  onCruiseChange,
  text,
  onTextChange,
}: ReaderSettingsProps) {
  return (
    <aside
      id={id}
      className={`reader-settings${open ? ' is-open' : ''}`}
      aria-hidden={!open}
      inert={!open ? true : undefined}
      aria-label="Reading menu"
    >
      <header className="reader-settings__header">
        <div className="reader-settings__top">
          <p className="reader-settings__brand">Spatial</p>
          <button
            type="button"
            className="reader-settings__close"
            onClick={onClose}
          >
            Close
          </button>
        </div>
        <h1 className="reader-settings__title">{title}</h1>
        <p className="reader-settings__hint">
          W/↑ or D/→ drive forward; S/↓ or A/← reverse. Double-tap W to boost.
          Set cruise on the dial or below.
        </p>
        <button
          type="button"
          className="reader-settings__library"
          onClick={onBack}
        >
          Library
        </button>
      </header>

      <div className="book-angle-controls">
        <label className="book-angle-controls__slider">
          <span className="book-angle-controls__meta">
            <span>Cruise speed</span>
            <span>{cruiseMph} mph</span>
          </span>
          <input
            type="range"
            min={CRUISE_SPEED_LIMITS.min}
            max={CRUISE_SPEED_LIMITS.max}
            step={CRUISE_SPEED_LIMITS.step}
            value={cruiseMph}
            onChange={(event) => onCruiseChange(Number(event.target.value))}
          />
        </label>
      </div>

      <BookAngleControls
        value={angles}
        onChange={onAnglesChange}
        cameraAngle={cameraAngle}
        onCameraAngleChange={onCameraAngleChange}
      />

      <label className="reader-settings__label" htmlFor="reader-text">
        Content
      </label>
      <textarea
        id="reader-text"
        className="reader-settings__textarea"
        value={text}
        onChange={(event) => onTextChange(event.target.value)}
        spellCheck
        tabIndex={open ? 0 : -1}
      />
    </aside>
  )
}
