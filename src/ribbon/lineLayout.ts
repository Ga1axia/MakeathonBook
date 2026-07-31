import { BOOK } from './bookLayout'
import { CanvasTextureRenderer } from './CanvasTextureRenderer'

const MEASURE_CANVAS = typeof document !== 'undefined' ? document.createElement('canvas') : null
const MEASURE_CTX = MEASURE_CANVAS?.getContext('2d') ?? null

export type LineLayout = {
  lines: string[]
  /** World width of each text ribbon */
  width: number
  halfWidth: number
  ribbonHeight: number
  gap: number
  rowPitch: number
  lineCenters: number[]
}

/**
 * Shared line wrapping + vertical placement used by ribbons and drive mode.
 */
export function buildLineLayout(text: string): LineLayout {
  const width = BOOK.pageWidth * 0.86
  const ribbonHeight = BOOK.ribbonHeight
  const gap = BOOK.lineGap
  const rowPitch = ribbonHeight + gap
  const topMargin = BOOK.pageHeight * 0.5 - BOOK.pageHeight * 0.12

  const font = `${BOOK.fontSize}px ${BOOK.fontFamily}`
  let lines: string[]
  if (MEASURE_CTX) {
    MEASURE_CTX.font = font
    lines = CanvasTextureRenderer.wrapLines(
      text,
      (value) => MEASURE_CTX.measureText(value).width,
      BOOK.textureWidth - 112,
    )
  } else {
    lines = text.replace(/\r\n/g, '\n').split('\n')
  }

  // Keep blank lines in the layout; drive mode portals past whitespace-only rows
  const driveLines = lines.length > 0 ? lines : ['']

  const lineCenters = driveLines.map(
    (_, index) => topMargin - ribbonHeight / 2 - index * rowPitch,
  )

  return {
    lines: driveLines,
    width,
    halfWidth: width / 2,
    ribbonHeight,
    gap,
    rowPitch,
    lineCenters,
  }
}
