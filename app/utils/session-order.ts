/**
 * Chronological ordering for a list of sessions.
 *
 * `sessionNumber` does NOT follow chronological order in aleph — it can be
 * reassigned independently of when a session was actually scheduled/played
 * (documented by the campaign maintainers themselves in
 * `sesiones/berlin_en_tinieblas/arcs/README.md`: "En aleph, además, el campo
 * `sessionNumber` no sigue el orden cronológico, así que todo aquí se ordena
 * por `scheduledDate`."). Any UI that lists a set of sessions and cares about
 * "what happened when" must sort by `scheduledDate`, not by `sessionNumber`
 * and not by whatever order the API/DB happens to return.
 *
 * Sessions with no `scheduledDate` (not yet scheduled) sort last, in their
 * original relative order: they have no date to place them on the timeline,
 * and a null date should not be treated as "earliest" (which `Date.parse`
 * would otherwise imply via `NaN` comparisons) nor spliced into the middle.
 */
export function sortSessionsByDate<T extends { scheduledDate?: string | Date | null }>(
  sessions: T[],
): T[] {
  return [...sessions].sort((a, b) => {
    const aTime = a.scheduledDate ? new Date(a.scheduledDate).getTime() : null
    const bTime = b.scheduledDate ? new Date(b.scheduledDate).getTime() : null
    if (aTime === null && bTime === null) return 0
    if (aTime === null) return 1
    if (bTime === null) return -1
    return aTime - bTime
  })
}
