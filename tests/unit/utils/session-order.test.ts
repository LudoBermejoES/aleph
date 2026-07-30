import { describe, it, expect } from 'vitest'
import { sortSessionsByDate } from '../../../app/utils/session-order'

/**
 * Regression cover for the arc detail page's "Linked Sessions" list.
 *
 * `sessionNumber` does NOT follow chronological order in aleph (documented by the
 * campaign maintainers in `sesiones/berlin_en_tinieblas/arcs/README.md`), and the
 * sessions API's default order is `desc(sessionNumber)` (see
 * `server/api/campaigns/[id]/sessions/index.get.ts`). A sort that happens to look
 * right on today's data (where sessionNumber and scheduledDate usually agree) would
 * regress silently, so every case here deliberately puts sessionNumber and
 * scheduledDate out of step with each other.
 */
describe('sortSessionsByDate', () => {
  it('orders by scheduledDate ascending even when sessionNumber disagrees', () => {
    // Mirrors the "raíces y mecanismos" case: sessionNumber does not track the
    // real play order at all.
    const sessions = [
      { id: 's-mid', sessionNumber: 50, scheduledDate: '2023-06-15' },
      { id: 's-first', sessionNumber: 79, scheduledDate: '2023-01-10' },
      { id: 's-last', sessionNumber: 1, scheduledDate: '2023-12-01' },
    ]

    expect(sortSessionsByDate(sessions).map((s) => s.id)).toEqual(['s-first', 's-mid', 's-last'])
  })

  it('does not merely reflect input order (would pass a no-op "sort")', () => {
    // Already-reverse-chronological input by scheduledDate; a stable no-op sort
    // would leave this untouched and this assertion would catch it.
    const sessions = [
      { id: 'a', sessionNumber: 1, scheduledDate: '2023-03-01' },
      { id: 'b', sessionNumber: 2, scheduledDate: '2023-02-01' },
      { id: 'c', sessionNumber: 3, scheduledDate: '2023-01-01' },
    ]

    expect(sortSessionsByDate(sessions).map((s) => s.id)).toEqual(['c', 'b', 'a'])
  })

  it('sends sessions with a null scheduledDate to the end, not to the middle or start', () => {
    const sessions = [
      { id: 'dated-late', sessionNumber: 2, scheduledDate: '2023-05-01' },
      { id: 'undated', sessionNumber: 1, scheduledDate: null },
      { id: 'dated-early', sessionNumber: 3, scheduledDate: '2023-01-01' },
    ]

    expect(sortSessionsByDate(sessions).map((s) => s.id)).toEqual([
      'dated-early',
      'dated-late',
      'undated',
    ])
  })

  it('keeps multiple undated sessions in their original relative order', () => {
    const sessions = [
      { id: 'dated', sessionNumber: 1, scheduledDate: '2023-01-01' },
      { id: 'undated-1', sessionNumber: 2, scheduledDate: null },
      { id: 'undated-2', sessionNumber: 3, scheduledDate: null },
    ]

    expect(sortSessionsByDate(sessions).map((s) => s.id)).toEqual([
      'dated',
      'undated-1',
      'undated-2',
    ])
  })

  it('does not mutate the input array', () => {
    const sessions = [
      { id: 'b', scheduledDate: '2023-02-01' },
      { id: 'a', scheduledDate: '2023-01-01' },
    ]
    const original = [...sessions]

    sortSessionsByDate(sessions)

    expect(sessions).toEqual(original)
  })

  it('matches the documented la-busqueda-de-julia case (weekly, already in order)', () => {
    // Sanity check against the clean-case fixture from the task: sessionNumber and
    // scheduledDate already agree here, so the sort must be a no-op on the ids.
    const sessions = [
      { id: 's74', sessionNumber: 74, scheduledDate: '2023-04-20' },
      { id: 's75', sessionNumber: 75, scheduledDate: '2023-04-27' },
      { id: 's76', sessionNumber: 76, scheduledDate: '2023-05-04' },
      { id: 's77', sessionNumber: 77, scheduledDate: '2023-05-11' },
      { id: 's78', sessionNumber: 78, scheduledDate: '2023-05-18' },
      { id: 's79', sessionNumber: 79, scheduledDate: '2023-05-25' },
    ]

    expect(sortSessionsByDate(sessions).map((s) => s.id)).toEqual([
      's74',
      's75',
      's76',
      's77',
      's78',
      's79',
    ])
  })
})
