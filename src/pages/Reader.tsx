import { useEffect, useState } from 'react'
import { ReaderCanvas } from '../components/ReaderCanvas'
import { ReaderSettings } from '../components/ReaderSettings'
import type { ReaderSession, ReadingMode } from '../state/readerState'
import type { BookAngles } from '../ribbon/bookLayout'

type ReaderProps = {
  session: ReaderSession
  onBack: () => void
  onModeChange: (mode: ReadingMode) => void
  onAnglesChange: (angles: BookAngles) => void
  onCameraAngleChange: (angle: number) => void
  onTextChange: (text: string) => void
}

/**
 * Full-screen reading experience — chrome lives in a click-to-open panel.
 */
export function Reader({
  session,
  onBack,
  onModeChange,
  onAnglesChange,
  onCameraAngleChange,
  onTextChange,
}: ReaderProps) {
  const [panelOpen, setPanelOpen] = useState(false)
  const driveMode = session.mode === 'drive'

  useEffect(() => {
    if (!panelOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPanelOpen(false)
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
        driveMode={driveMode}
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
          onClick={() => setPanelOpen(false)}
        />
      ) : null}

      <ReaderSettings
        id="reader-panel"
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        title={session.book.title}
        mode={session.mode}
        onModeChange={onModeChange}
        onBack={onBack}
        angles={session.angles}
        onAnglesChange={onAnglesChange}
        cameraAngle={session.cameraAngle}
        onCameraAngleChange={onCameraAngleChange}
        text={session.book.text}
        onTextChange={onTextChange}
        driveMode={driveMode}
      />
    </div>
  )
}
