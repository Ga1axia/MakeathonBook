import { useEffect, useMemo, useRef, useState } from 'react'
import { BOOKS, loadBook, loadBookMeta } from '../books/catalog'
import { prepareBookText } from '../books/prepareBookText'
import { BookGrid } from '../components/BookGrid'
import { EmptyState } from '../components/EmptyState'
import { UploadPanel } from '../components/UploadPanel'
import {
  bookFromUpload,
  type LibraryBook,
} from '../state/readerState'

type CatalogMeta = {
  id: string
  title: string
  author: string
  filename: string
  source: 'catalog'
}

type LibraryProps = {
  uploadedBooks: LibraryBook[]
  onUpload: (book: LibraryBook) => void
  onOpenBook: (book: LibraryBook) => void
  continueTitle?: string | null
}

/**
 * Quiet library — search, upload, and open a book into the reader.
 */
export function Library({
  uploadedBooks,
  onUpload,
  onOpenBook,
  continueTitle = null,
}: LibraryProps) {
  const [query, setQuery] = useState('')
  const [catalog, setCatalog] = useState<CatalogMeta[]>(() =>
    BOOKS.map((book) => ({
      id: book.id,
      title: book.title,
      author: 'Loading…',
      filename: book.filename,
      source: 'catalog' as const,
    })),
  )
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const uploadTriggerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false

    const hydrate = async () => {
      const next = await Promise.all(
        BOOKS.map(async (book) => {
          try {
            const loaded = await loadBookMeta(book.id)
            return {
              id: loaded.id,
              title: loaded.title,
              author: loaded.author,
              filename: loaded.filename,
              source: 'catalog' as const,
            }
          } catch {
            return {
              id: book.id,
              title: book.title,
              author: 'Unknown',
              filename: book.filename,
              source: 'catalog' as const,
            }
          }
        }),
      )

      if (!cancelled) setCatalog(next)
    }

    void hydrate()
    return () => {
      cancelled = true
    }
  }, [])

  const items = useMemo(() => {
    const uploaded = uploadedBooks.map((book) => ({
      id: book.id,
      title: book.title,
      author: book.author,
      filename: book.filename,
      source: book.source,
      status:
        continueTitle && book.title === continueTitle
          ? 'Continue reading'
          : null,
    }))

    const builtIn = catalog.map((book) => ({
      ...book,
      status:
        continueTitle && book.title === continueTitle
          ? 'Continue reading'
          : null,
    }))

    const merged = [...uploaded, ...builtIn]
    const q = query.trim().toLowerCase()
    if (!q) return merged

    return merged.filter(
      (book) =>
        book.title.toLowerCase().includes(q) ||
        book.author.toLowerCase().includes(q),
    )
  }, [catalog, continueTitle, query, uploadedBooks])

  const openCatalogBook = async (id: string) => {
    const uploaded = uploadedBooks.find((book) => book.id === id)
    if (uploaded) {
      onOpenBook({
        ...uploaded,
        text: prepareBookText(uploaded.text),
      })
      return
    }

    setError(null)
    setLoadingId(id)
    try {
      const book = await loadBook(id)
      onOpenBook({
        id: book.id,
        title: book.title,
        author: book.author,
        text: prepareBookText(book.text),
        source: 'catalog',
        filename: book.filename,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not open that book.')
      setLoadingId(null)
    }
  }

  const handleUpload = (file: File, text: string) => {
    const book = bookFromUpload(file, text)
    onUpload(book)
    onOpenBook({
      ...book,
      text: prepareBookText(book.text),
    })
  }

  const focusUpload = () => {
    const input = uploadTriggerRef.current?.querySelector('button')
    input?.click()
  }

  return (
    <div className="page page--library">
      <div className="library">
        <header className="library__header">
          <div>
            <h1 className="library__title">Library</h1>
            <p className="library__subtitle">
              Choose a book or upload a plain text file to begin reading.
            </p>
          </div>
          <div ref={uploadTriggerRef}>
            <UploadPanel onUpload={handleUpload} />
          </div>
        </header>

        <div className="library__toolbar">
          <label className="library__search">
            <span className="visually-hidden">Search books</span>
            <input
              type="search"
              placeholder="Search by title or author"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
        </div>

        {items.length === 0 ? (
          <EmptyState
            title={query ? 'No matching books' : 'Your library is empty'}
            description={
              query
                ? 'Try a different search, or upload a .txt file.'
                : 'Upload a plain text book to start reading in 3D.'
            }
            actionLabel="Upload book"
            onAction={focusUpload}
          />
        ) : (
          <BookGrid
            books={items}
            loadingId={loadingId}
            onSelect={(id) => void openCatalogBook(id)}
          />
        )}

        {error ? <p className="library__error">{error}</p> : null}
      </div>
    </div>
  )
}
