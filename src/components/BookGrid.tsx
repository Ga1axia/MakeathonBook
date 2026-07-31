import { BookCard } from './BookCard'
import type { LibraryBook } from '../state/readerState'

type BookGridItem = Pick<
  LibraryBook,
  'id' | 'title' | 'author' | 'source' | 'filename'
> & {
  status?: string | null
}

type BookGridProps = {
  books: BookGridItem[]
  loadingId: string | null
  onSelect: (id: string) => void
}

/**
 * Minimal grid of selectable library books.
 */
export function BookGrid({ books, loadingId, onSelect }: BookGridProps) {
  return (
    <ul className="book-grid">
      {books.map((book) => (
        <li key={book.id}>
          <BookCard
            book={book}
            busy={loadingId === book.id}
            status={book.status}
            onSelect={onSelect}
            disabled={loadingId !== null}
          />
        </li>
      ))}
    </ul>
  )
}
