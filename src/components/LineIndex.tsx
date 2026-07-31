import { useEffect, useRef } from 'react'

export type LineIndexProps = {
  lines: string[]
  activeIndex: number
  onSelect: (lineIndex: number) => void
}

function preview(line: string): string {
  const trimmed = line.replace(/\s+/g, ' ').trim()
  if (!trimmed) return '—'
  return trimmed.length > 42 ? `${trimmed.slice(0, 42)}…` : trimmed
}

/**
 * Right-rail line index — click a row to portal-skip the car ahead.
 */
export function LineIndex({ lines, activeIndex, onSelect }: LineIndexProps) {
  const listRef = useRef<HTMLUListElement>(null)
  const activeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [activeIndex])

  return (
    <aside className="line-index" aria-label="Line index">
      <header className="line-index__header">
        <p className="line-index__label">Index</p>
        <p className="line-index__meta">
          {Math.min(activeIndex + 1, lines.length)} / {lines.length}
        </p>
      </header>

      <ul ref={listRef} className="line-index__list">
        {lines.map((line, index) => {
          const blank = line.trim().length === 0
          const active = index === activeIndex
          return (
            <li key={`${index}-${line.slice(0, 12)}`}>
              <button
                type="button"
                ref={active ? activeRef : undefined}
                className={`line-index__item${active ? ' is-active' : ''}${blank ? ' is-blank' : ''}`}
                disabled={blank}
                onClick={() => onSelect(index)}
              >
                <span className="line-index__num">{index + 1}</span>
                <span className="line-index__text">{preview(line)}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </aside>
  )
}
