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
  /** Page-local X where the first glyph of each line begins */
  textStartXs: number[]
  /** Page-local X where the last glyph of each line ends (spaces ignored) */
  textEndXs: number[]
}

/**
 * Shared line wrapping + vertical placement used by ribbons and drive mode.
 */
export function buildLineLayout(text: string): LineLayout {
  const width = BOOK.pageWidth * 0.94
  const halfWidth = width / 2
  const ribbonHeight = BOOK.ribbonHeight
  const gap = BOOK.lineGap
  const rowPitch = ribbonHeight + gap
  const topMargin = BOOK.pageHeight * 0.5 - BOOK.pageHeight * 0.12
  const pad = BOOK.textPaddingX
  const maxWrap = BOOK.textureWidth - pad * 2

  const font = `${BOOK.fontSize}px ${BOOK.fontFamily}`
  let lines: string[]
  if (MEASURE_CTX) {
    MEASURE_CTX.font = font
    lines = CanvasTextureRenderer.wrapLines(
      text,
      (value) => MEASURE_CTX.measureText(value).width,
      maxWrap,
    )
  } else {
    lines = text.replace(/\r\n/g, '\n').split('\n')
  }

  // No empty ribbons — blank Enter gaps are stripped
  const filtered = lines.filter((line) => line.trim().length > 0)
  const driveLines = filtered.length > 0 ? filtered : ['']

  const lineCenters = driveLines.map(
    (_, index) => topMargin - ribbonHeight / 2 - index * rowPitch,
  )

  const textStartXs: number[] = []
  const textEndXs: number[] = []
  for (const line of driveLines) {
    const { startX, endX } = measureTextSpan(line, width, halfWidth, pad)
    textStartXs.push(startX)
    textEndXs.push(endX)
  }

  return {
    lines: driveLines,
    width,
    halfWidth,
    ribbonHeight,
    gap,
    rowPitch,
    lineCenters,
    textStartXs,
    textEndXs,
  }
}

/**
 * World-X span of the visible glyphs on a ribbon, ignoring leading/trailing spaces.
 */
function measureTextSpan(
  line: string,
  ribbonWidth: number,
  halfWidth: number,
  padPx: number,
): { startX: number; endX: number } {
  const trimmed = line.trim()
  const texW = BOOK.textureWidth
  const startU = padPx / texW

  let textPx = 0
  if (trimmed) {
    if (MEASURE_CTX) {
      MEASURE_CTX.font = `${BOOK.fontSize}px ${BOOK.fontFamily}`
      textPx = MEASURE_CTX.measureText(trimmed).width
    } else {
      textPx = trimmed.length * BOOK.fontSize * 0.5
    }
  }

  const endU = Math.min(1 - padPx / texW, (padPx + textPx) / texW)
  const startX = -halfWidth + startU * ribbonWidth
  let endX = -halfWidth + endU * ribbonWidth

  // Keep a tiny traversable span even for empty/odd metrics
  if (endX <= startX + 0.05) {
    endX = startX + Math.min(0.35, ribbonWidth * 0.2)
  }

  return { startX, endX }
}
