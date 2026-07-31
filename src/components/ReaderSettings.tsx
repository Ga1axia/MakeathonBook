import { BookAngleControls } from './BookAngleControls'
import { ModeToggle } from './ModeToggle'
import type { ReadingMode } from '../state/readerState'
import type { BookAngles } from '../ribbon/bookLayout'

type ReaderSettingsProps = {
  id?: string
  open: boolean
  onClose: () => void
  title: string
  mode: ReadingMode
  onModeChange: (mode: ReadingMode) => void
  onBack: () => void
  angles: BookAngles
  onAnglesChange: (angles: BookAngles) => void
  cameraAngle: number
  onCameraAngleChange: (angle: number) => void
  text: string
  onTextChange: (text: string) => void
  driveMode: boolean
}

/**
 * Slide-over reader controls — only visible when opened from Menu.
 */
export function ReaderSettings({
  id,
  open,
  onClose,
  title,
  mode,
  onModeChange,
  onBack,
  angles,
  onAnglesChange,
  cameraAngle,
  onCameraAngleChange,
  text,
  onTextChange,
  driveMode,
}: ReaderSettingsProps) {
  return (
    <aside
      id={id}
      className={`reader-settings${open ? ' is-open' : ''}`}
      aria-hidden={!open}
      aria-label="Reading menu"
    >
      <header className="reader-settings__header">
        <div className="reader-settings__top">
          <p className="reader-settings__brand">Ribbon</p>
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
          {driveMode
            ? 'W/↑ or D/→ drive forward; S/↓ or A/← reverse. Reach a portal to change lines, or use the index.'
            : 'Hover a line to lift it, or switch to Drive mode for the car + portal run.'}
        </p>
        <button
          type="button"
          className="reader-settings__library"
          onClick={onBack}
        >
          Library
        </button>
      </header>

      <ModeToggle mode={mode} onChange={onModeChange} />

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
