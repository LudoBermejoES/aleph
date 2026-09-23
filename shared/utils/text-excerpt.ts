/**
 * Pure, dependency-free markdown/HTML flattening for a short plain-text excerpt -- used by
 * the map pins popup (add-pin-popup-entity-preview) to turn an entity's full markdown body
 * (location/character) or free-text column (organization's `description`) into a couple of
 * sentences safe to drop into a hand-built HTML string once escaped by the caller.
 *
 * design.md D5: this module does NOT escape HTML -- `app/utils/mapPinMarker.ts`'s
 * `escapeHtml` is the single place responsible for that, the same function that already
 * escapes every other field interpolated into the popup. Callers MUST run any secret-block
 * stripping (`stripSecretBlocks`) BEFORE calling `buildExcerpt`, never after -- excerpting
 * first and stripping second can truncate mid-secret-block and still leak its opening words.
 */

const DEFAULT_MAX_LENGTH = 200

/**
 * Strips markdown syntax and any literal HTML tags down to plain prose, collapsing all
 * whitespace (including blank lines between paragraphs) to single spaces. Order matters:
 * fenced code and images are removed before link-unwrapping and emphasis-stripping, and list/
 * heading/blockquote markers are stripped line-by-line before the generic emphasis pass so a
 * bullet's leading `-` is never mistaken for a strikethrough marker.
 */
export function flattenToPlainText(source: string): string {
  return source
    .replace(/```[\s\S]*?```/g, ' ') // fenced code blocks
    .replace(/`([^`]*)`/g, '$1') // inline code -- keep the text, drop the backticks
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ') // images -- dropped entirely, no alt text in an excerpt
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // links -- keep the visible text
    .replace(/<[^>]+>/g, ' ') // any literal HTML tag (defense in depth for a free-text column)
    .replace(/^\s{0,3}#{1,6}\s+/gm, '') // heading markers
    .replace(/^\s{0,3}>\s?/gm, '') // blockquote markers
    .replace(/^\s{0,3}[-*+]\s+/gm, '') // bullet-list markers
    .replace(/^\s{0,3}\d+[.)]\s+/gm, '') // ordered-list markers
    .replace(/^\s{0,3}(?:-{3,}|\*{3,}|_{3,})\s*$/gm, ' ') // horizontal rules
    .replace(/[*_~]{1,3}([^*_~]+)[*_~]{1,3}/g, '$1') // emphasis/strikethrough
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Flattens `source` (see `flattenToPlainText`) and truncates it to `maxLength` characters,
 * breaking on a word boundary when one is available reasonably close to the limit (a
 * mid-word cut reads worse than a slightly shorter excerpt) and appending an ellipsis.
 * Returns an empty string for empty/whitespace-only input -- callers treat that as "no
 * excerpt", same as `null`.
 */
export function buildExcerpt(source: string, maxLength: number = DEFAULT_MAX_LENGTH): string {
  const flat = flattenToPlainText(source)
  if (!flat) return ''
  if (flat.length <= maxLength) return flat
  const truncated = flat.slice(0, maxLength)
  const lastSpace = truncated.lastIndexOf(' ')
  const boundary = lastSpace > maxLength * 0.6 ? truncated.slice(0, lastSpace) : truncated
  return `${boundary.trimEnd()}…`
}
