import type { ReadingMode } from '../state/readerState'

type ModeToggleProps = {
  mode: ReadingMode
  onChange: (mode: ReadingMode) => void
}

/**
 * Understated Standard / Drive mode switch for the reader chrome.
 */
export function ModeToggle({ mode, onChange }: ModeToggleProps) {
  return (
    <div className="mode-toggle" role="group" aria-label="Reading mode">
      <button
        type="button"
        className={`mode-toggle__btn${mode === 'standard' ? ' is-active' : ''}`}
        onClick={() => onChange('standard')}
        aria-pressed={mode === 'standard'}
      >
        Standard
      </button>
      <button
        type="button"
        className={`mode-toggle__btn${mode === 'drive' ? ' is-active' : ''}`}
        onClick={() => onChange('drive')}
        aria-pressed={mode === 'drive'}
      >
        Drive
      </button>
    </div>
  )
}
