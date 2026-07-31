import type { BookAngles } from '../ribbon/bookLayout'
import {
  DEFAULT_BOOK_ANGLES,
  DEFAULT_CAMERA_ANGLE,
} from '../ribbon/bookLayout'
import { CRUISE_SPEED_LIMITS } from '../ribbon/driveSpeed'

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
  /** Cruise target shown on the dial / used while holding drive */
  cruiseMph: number
}

/** Short sample used by “Try it now” so drive mode starts immediately. */
export const DEMO_TEXT = `The page is not flat.

Each line is its own ribbon of paper. Drive left to right under the words — they rise under the car and fall away on either side, as if the line itself were being lifted from the book.

Neighboring lines stir only a little. The rest of the page stays quiet. Type stays glued to the surface — it turns with every bend, never floating free of the paper it belongs to.

Reach a portal at the end of a line to continue on the next.`

export function createDemoBook(): LibraryBook {
  return {
    id: 'demo-spatial',
    title: 'Read beyond the page',
    author: 'Spatial',
    text: DEMO_TEXT,
    source: 'catalog',
  }
}

export function createReaderSession(book: LibraryBook): ReaderSession {
  return {
    book,
    angles: { ...DEFAULT_BOOK_ANGLES },
    cameraAngle: DEFAULT_CAMERA_ANGLE,
    lineIndex: 0,
    cruiseMph: CRUISE_SPEED_LIMITS.default,
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
