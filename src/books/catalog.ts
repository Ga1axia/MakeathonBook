export type BookMeta = {
  id: string
  filename: string
  title: string
}

export type BookEntry = BookMeta & {
  author: string
  text: string
}

/** Canonical library — served as static files from /books/*.txt */
const KNOWN_BOOKS: Record<string, { title: string; author: string; filename: string }> =
  {
    odyssey: {
      title: 'The Odyssey',
      author: 'Homer',
      filename: 'odyssey.txt',
    },
    thesecretsofthechimneys: {
      title: 'The Secret of Chimneys',
      author: 'Agatha Christie',
      filename: 'thesecretsofthechimneys.txt',
    },
    crimeandpunishment: {
      title: 'Crime and Punishment',
      author: 'Fyodor Dostoevsky',
      filename: 'crimeandpunishment.txt',
    },
  }

/**
 * Books available in the library.
 */
export const BOOKS: BookMeta[] = Object.entries(KNOWN_BOOKS)
  .map(([id, book]) => ({
    id,
    filename: book.filename,
    title: book.title,
  }))
  .sort((a, b) => a.title.localeCompare(b.title))

const bookCache = new Map<string, BookEntry>()

function bookUrl(filename: string): string {
  // Stable public URL — not a hashed JS chunk, so deploys won't 404 old imports
  return `/books/${filename}`
}

export async function loadBook(id: string): Promise<BookEntry> {
  const cached = bookCache.get(id)
  if (cached) return cached

  const known = KNOWN_BOOKS[id]
  if (!known) {
    throw new Error(`Unknown book: ${id}`)
  }

  const response = await fetch(bookUrl(known.filename))
  if (!response.ok) {
    throw new Error(`Could not load ${known.title} (${response.status})`)
  }

  const text = await response.text()
  const entry: BookEntry = {
    id,
    filename: known.filename,
    title: known.title,
    author: known.author,
    text,
  }

  bookCache.set(id, entry)
  return entry
}

export async function loadBookMeta(
  id: string,
): Promise<BookMeta & { author: string }> {
  const known = KNOWN_BOOKS[id]
  if (!known) {
    throw new Error(`Unknown book: ${id}`)
  }

  // Metadata does not need the full text body
  return {
    id,
    filename: known.filename,
    title: known.title,
    author: known.author,
  }
}
