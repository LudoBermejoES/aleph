/**
 * Pure helpers for the arc/chapter commands.
 *
 * Deliberately dependency-free (no client, no chalk) so unit tests can import it
 * without touching the network or the on-disk config store.
 */

/**
 * Parse a `--sort-order <n>` flag value into a number.
 * The arcs/chapters endpoints validate `sortOrder` with `z.number()`, so a string
 * would come back as a 422 — reject it here instead.
 * @param {string|number|undefined} raw
 * @returns {number|undefined} undefined when the flag was not supplied
 * @throws {Error} when the value is not a finite number
 */
export function parseSortOrder(raw) {
  if (raw === undefined) return undefined
  const value = typeof raw === 'string' ? raw.trim() : raw
  const n = Number(value)
  if (value === '' || !Number.isFinite(n)) {
    throw new Error(`--sort-order must be a number (got "${raw}")`)
  }
  return n
}

/**
 * Same as parseSortOrder but reports to stderr and exits 1 instead of throwing,
 * so no request is sent for a bad value.
 * @param {string|number|undefined} raw
 * @returns {number|undefined}
 */
export function sortOrderOrExit(raw) {
  try {
    return parseSortOrder(raw)
  } catch (err) {
    process.stderr.write(`Error: ${err.message}\n`)
    process.exit(1)
  }
}

/**
 * Find an arc in a `GET /api/campaigns/:id/arcs` payload by slug, falling back to id.
 * Slug wins so that `--arc act-i` never resolves to an arc whose id happens to match.
 * @param {Array<{id: string, slug?: string}>} arcList
 * @param {string} ref arc slug or arc id
 * @returns {object|null}
 */
export function findArcRef(arcList, ref) {
  if (!ref) return null
  const list = Array.isArray(arcList) ? arcList : []
  return list.find((a) => a && a.slug === ref) || list.find((a) => a && a.id === ref) || null
}

/**
 * Flatten the nested `chapters` of a `GET /api/campaigns/:id/arcs` payload into one
 * row per chapter, carrying the arc's name/slug/id. Arcs keep their server order
 * (ascending sortOrder) and chapters are ordered by sortOrder within each arc.
 * @param {Array<object>} arcList
 * @param {string} [arcRef] optional arc slug (or id) to narrow to a single arc
 * @returns {Array<object>}
 */
export function flattenChapters(arcList, arcRef) {
  const list = Array.isArray(arcList) ? arcList : []
  const rows = []
  for (const arc of list) {
    if (!arc) continue
    if (arcRef && arc.slug !== arcRef && arc.id !== arcRef) continue
    const chapters = Array.isArray(arc.chapters) ? [...arc.chapters] : []
    chapters.sort((a, b) => (a?.sortOrder ?? 0) - (b?.sortOrder ?? 0))
    for (const chapter of chapters) {
      if (!chapter) continue
      rows.push({
        ...chapter,
        sortOrder: chapter.sortOrder ?? 0,
        arcId: chapter.arcId ?? arc.id,
        arcName: arc.name ?? '',
        arcSlug: arc.slug ?? '',
      })
    }
  }
  return rows
}
