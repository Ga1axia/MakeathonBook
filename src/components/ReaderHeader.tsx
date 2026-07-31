import { ModeToggle } from './ModeToggle'
import type { ReadingMode } from '../state/readerState'

type ReaderHeaderProps = {
  title: string
  mode: ReadingMode
  onModeChange: (mode: ReadingMode) => void
  onBack: () => void
  settingsOpen: boolean
  onToggleSettings: () => void
}

/**
 * Minimal reader chrome — back, title, mode, settings.
 */
export function ReaderHeader({
  title,
  mode,
  onModeChange,
  onBack,
  settingsOpen,
  onToggleSettings,
}: ReaderHeaderProps) {
  return (
    <header className="reader-header">
      <div className="reader-header__left">
        <button type="button" className="reader-header__back" onClick={onBack}>
          Library
        </button>
        <h1 className="reader-header__title">{title}</h1>
      </div>

      <div className="reader-header__right">
        <ModeToggle mode={mode} onChange={onModeChange} />
        <button
          type="button"
          className={`reader-header__settings${settingsOpen ? ' is-active' : ''}`}
          onClick={onToggleSettings}
          aria-pressed={settingsOpen}
          aria-label="Reading settings"
        >
          Settings
        </button>
      </div>
    </header>
  )
}
