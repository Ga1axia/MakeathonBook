import { useRef, useState } from 'react'

type UploadPanelProps = {
  onUpload: (file: File, text: string) => void
  compact?: boolean
}

/**
 * Plain-text book upload control.
 */
export function UploadPanel({ onUpload, compact = false }: UploadPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const handleFiles = async (fileList: FileList | null) => {
    const file = fileList?.[0]
    if (!file) return

    setError(null)
    setBusy(true)

    try {
      if (!file.name.toLowerCase().endsWith('.txt') && file.type !== 'text/plain') {
        throw new Error('Upload a plain .txt file.')
      }

      const text = await file.text()
      if (!text.trim()) {
        throw new Error('That file appears to be empty.')
      }

      onUpload(file, text)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not read that file.')
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className={`upload-panel${compact ? ' upload-panel--compact' : ''}`}>
      <input
        ref={inputRef}
        id="book-upload"
        className="upload-panel__input"
        type="file"
        accept=".txt,text/plain"
        disabled={busy}
        onChange={(event) => void handleFiles(event.target.files)}
      />
      <button
        type="button"
        className="btn btn--secondary"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
      >
        {busy ? 'Uploading…' : 'Upload book'}
      </button>
      {error ? <p className="upload-panel__error">{error}</p> : null}
    </div>
  )
}
