import * as THREE from 'three'
import { BOOK } from './bookLayout'

export type CanvasTextureOptions = {
  width?: number
  height?: number
  paddingX?: number
  fontSize?: number
  fontFamily?: string
  textColor?: string
}

const DEFAULTS = {
  width: BOOK.textureWidth,
  height: BOOK.textureHeight,
  paddingX: BOOK.textPaddingX,
  fontSize: BOOK.fontSize,
  fontFamily: BOOK.fontFamily,
  textColor: '#1a1917',
} as const

/**
 * Renders a single line of text onto a transparent canvas strip.
 * Only the glyphs are opaque so shadows come from the type, not the ribbon body.
 */
export class CanvasTextureRenderer {
  readonly canvas: HTMLCanvasElement
  readonly texture: THREE.CanvasTexture
  private readonly ctx: CanvasRenderingContext2D
  private options: Required<CanvasTextureOptions>
  private currentText = ''

  constructor(options: CanvasTextureOptions = {}) {
    this.options = { ...DEFAULTS, ...options }
    this.canvas = document.createElement('canvas')
    this.canvas.width = this.options.width
    this.canvas.height = this.options.height

    const ctx = this.canvas.getContext('2d', { alpha: true })
    if (!ctx) {
      throw new Error('Could not acquire 2D canvas context')
    }
    this.ctx = ctx

    this.texture = new THREE.CanvasTexture(this.canvas)
    this.texture.colorSpace = THREE.SRGBColorSpace
    this.texture.anisotropy = 8
    this.texture.minFilter = THREE.LinearMipmapLinearFilter
    this.texture.magFilter = THREE.LinearFilter
    this.texture.generateMipmaps = true
    this.texture.premultiplyAlpha = false

    this.render('')
  }

  get text(): string {
    return this.currentText
  }

  setText(text: string): void {
    if (text === this.currentText) return
    this.currentText = text
    this.render(text)
  }

  dispose(): void {
    this.texture.dispose()
  }

  static wrapLines(
    text: string,
    measure: (value: string) => number,
    maxWidth: number,
  ): string[] {
    const paragraphs = text.replace(/\r\n/g, '\n').split('\n')
    const lines: string[] = []

    for (const paragraph of paragraphs) {
      if (paragraph.trim() === '') {
        lines.push('')
        continue
      }

      const words = paragraph.split(/\s+/)
      let current = ''

      for (const word of words) {
        const candidate = current ? `${current} ${word}` : word
        if (measure(candidate) > maxWidth && current) {
          lines.push(current)
          current = word
        } else {
          current = candidate
        }
      }

      if (current) lines.push(current)
    }

    return lines.length > 0 ? lines : ['']
  }

  private render(text: string): void {
    const { width, height, paddingX, fontSize, fontFamily, textColor } = this.options
    const { ctx } = this

    ctx.clearRect(0, 0, width, height)

    ctx.fillStyle = textColor
    ctx.textBaseline = 'middle'
    ctx.font = `${fontSize}px ${fontFamily}`

    const line = text.replace(/\s+/g, ' ').trim()
    if (!line) {
      this.texture.needsUpdate = true
      return
    }

    const maxWidth = width - paddingX * 2
    let draw = line
    while (draw.length > 1 && ctx.measureText(draw).width > maxWidth) {
      draw = `${draw.slice(0, -2)}…`
    }

    ctx.fillText(draw, paddingX, height / 2)
    this.texture.needsUpdate = true
  }
}
