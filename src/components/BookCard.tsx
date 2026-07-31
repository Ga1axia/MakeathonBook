import type { LibraryBook } from '../state/readerState'

type BookCardProps = {
  book: Pick<LibraryBook, 'id' | 'title' | 'author' | 'source' | 'filename'>
  busy?: boolean
  status?: string | null
  onSelect: (id: string) => void
  disabled?: boolean
}

/**
 * Quiet library entry — title, author, light metadata.
 */
export function BookCard({
  book,
  busy = false,
  status = null,
  onSelect,
  disabled = false,
}: BookCardProps) {
  const meta =
    book.source === 'upload'
      ? book.filename ?? 'Uploaded text'
      : book.filename ?? 'Library text'

  return (
    <button
      type="button"
      className="book-card"
      onClick={() => onSelect(book.id)}
      disabled={disabled}
    >
      <span className="book-card__title">{book.title}</span>
      <span className="book-card__author">{book.author}</span>
      <span className="book-card__meta">
        {busy ? 'Opening…' : status ?? meta}
      </span>
    </button>
  )
}
