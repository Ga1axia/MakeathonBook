export type BookMeta = {
  id: string
  filename: string
  title: string
}

export type BookEntry = BookMeta & {
  author: string
  text: string
}

const loaders = import.meta.glob('../../books/*.txt', {
  query: '?raw',
  import: 'default',
}) as Record<string, () => Promise<string>>

function filenameFromPath(path: string): string {
  const parts = path.split('/')
  return parts[parts.length - 1] ?? path
}

function titleFromFilename(filename: string): string {
  return filename
    .replace(/\.txt$/i, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function parseMetadata(raw: string, fallbackTitle: string) {
  const title = raw.match(/^Title:\s*(.+)$/m)?.[1]?.trim()
  const author = raw.match(/^Author:\s*(.+)$/m)?.[1]?.trim()
  return {
    title: title || fallbackTitle,
    author: author || 'Unknown',
  }
}

const entries = Object.keys(loaders).map((path) => {
  const filename = filenameFromPath(path)
  const id = filename.replace(/\.txt$/i, '')
  return {
    id,
    filename,
    title: titleFromFilename(filename),
    path,
  }
})

/**
 * Books discovered from the project `books/` folder at build time.
 */
export const BOOKS: BookMeta[] = entries
  .map(({ id, filename, title }) => ({ id, filename, title }))
  .sort((a, b) => a.title.localeCompare(b.title))

const pathById = new Map(entries.map((entry) => [entry.id, entry.path]))
const bookCache = new Map<string, BookEntry>()

export async function loadBook(id: string): Promise<BookEntry> {
  const cached = bookCache.get(id)
  if (cached) return cached

  const path = pathById.get(id)
  const loader = path ? loaders[path] : undefined
  if (!path || !loader) {
    throw new Error(`Unknown book: ${id}`)
  }

  const text = await loader()
  const listed = BOOKS.find((book) => book.id === id)
  const fallbackTitle = listed?.title ?? titleFromFilename(`${id}.txt`)
  const meta = parseMetadata(text, fallbackTitle)

  if (listed) {
    listed.title = meta.title
  }

  const entry: BookEntry = {
    id,
    filename: listed?.filename ?? `${id}.txt`,
    title: meta.title,
    author: meta.author,
    text,
  }

  bookCache.set(id, entry)
  return entry
}

export async function loadBookMeta(
  id: string,
): Promise<BookMeta & { author: string }> {
  const book = await loadBook(id)
  return {
    id: book.id,
    filename: book.filename,
    title: book.title,
    author: book.author,
  }
}
