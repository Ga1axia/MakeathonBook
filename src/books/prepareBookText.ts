/** Keep ribbon mesh count manageable for long public-domain texts. */
const MAX_CHARS = 4200

/**
 * Strip Project Gutenberg boilerplate and trim to a readable excerpt.
 */
export function prepareBookText(raw: string): string {
  let text = raw.replace(/\r\n/g, '\n')

  const startMatch = text.match(/\*\*\*\s*START OF[\s\S]*?\*\*\*/)
  if (startMatch && startMatch.index !== undefined) {
    text = text.slice(startMatch.index + startMatch[0].length)
  }

  const endMatch = text.match(/\*\*\*\s*END OF/)
  if (endMatch && endMatch.index !== undefined) {
    text = text.slice(0, endMatch.index)
  }

  // Prefer the first numbered book / chapter heading when present
  const bodyMatch = text.match(/\n(BOOK I\.|CHAPTER I\.|CHAPTER 1\b)/i)
  if (bodyMatch && bodyMatch.index !== undefined) {
    text = text.slice(bodyMatch.index + 1)
  }

  text = text.replace(/\n{3,}/g, '\n\n').trim()

  if (text.length <= MAX_CHARS) return text

  const cut = text.slice(0, MAX_CHARS)
  const lastBreak = Math.max(cut.lastIndexOf('\n\n'), cut.lastIndexOf('. '))
  const excerpt = (lastBreak > MAX_CHARS * 0.55 ? cut.slice(0, lastBreak + 1) : cut).trim()
  return `${excerpt}\n\n…`
}
