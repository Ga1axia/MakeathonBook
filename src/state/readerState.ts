import type { BookAngles } from '../ribbon/bookLayout'
import {
  DEFAULT_BOOK_ANGLES,
  DEFAULT_CAMERA_ANGLE,
} from '../ribbon/bookLayout'

export type AppPage = 'home' | 'library' | 'reader'

export type LibraryBook = {
  id: string
  title: string
  author: string
  text: string
  source: 'catalog' | 'upload'
  filename?: string
}

export type ReaderSession = {
  book: LibraryBook
  angles: BookAngles
  cameraAngle: number
  lineIndex: number
}

export function createReaderSession(book: LibraryBook): ReaderSession {
  return {
    book,
    angles: { ...DEFAULT_BOOK_ANGLES },
    cameraAngle: DEFAULT_CAMERA_ANGLE,
    lineIndex: 0,
  }
}

export function bookFromUpload(file: File, text: string): LibraryBook {
  const baseName = file.name.replace(/\.txt$/i, '').trim() || 'Untitled'
  const title = baseName
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())

  return {
    id: `upload-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title,
    author: 'Uploaded',
    text,
    source: 'upload',
    filename: file.name,
  }
}
