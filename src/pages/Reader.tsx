import { useEffect, useState } from 'react'
import { ReaderCanvas } from '../components/ReaderCanvas'
import { ReaderSettings } from '../components/ReaderSettings'
import type { ReaderSession } from '../state/readerState'
import type { BookAngles } from '../ribbon/bookLayout'

type ReaderProps = {
  session: ReaderSession
  onBack: () => void
  onAnglesChange: (angles: BookAngles) => void
  onCameraAngleChange: (angle: number) => void
  onTextChange: (text: string) => void
}

/**
 * Full-screen drive-to-read experience — chrome lives in a click-to-open panel.
 */
export function Reader({
  session,
  onBack,
  onAnglesChange,
  onCameraAngleChange,
  onTextChange,
}: ReaderProps) {
  const [panelOpen, setPanelOpen] = useState(false)

  const closePanel = () => {
    setPanelOpen(false)
    // Drop focus from hidden menu controls so drive keys aren't swallowed
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur()
    }
  }

  useEffect(() => {
    if (!panelOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closePanel()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [panelOpen])

  return (
    <div className={`page page--reader${panelOpen ? ' is-panel-open' : ''}`}>
      <ReaderCanvas
        text={session.book.text}
        angles={session.angles}
        cameraAngle={session.cameraAngle}
      />

      {!panelOpen ? (
        <button
          type="button"
          className="reader-menu-open"
          onClick={() => setPanelOpen(true)}
          aria-expanded={false}
          aria-controls="reader-panel"
        >
          Menu
        </button>
      ) : null}

      {panelOpen ? (
        <button
          type="button"
          className="reader-menu-backdrop"
          aria-label="Close menu"
          onClick={closePanel}
        />
      ) : null}

      <ReaderSettings
        id="reader-panel"
        open={panelOpen}
        onClose={closePanel}
        title={session.book.title}
        onBack={onBack}
        angles={session.angles}
        onAnglesChange={onAnglesChange}
        cameraAngle={session.cameraAngle}
        onCameraAngleChange={onCameraAngleChange}
        text={session.book.text}
        onTextChange={onTextChange}
      />
    </div>
  )
}
