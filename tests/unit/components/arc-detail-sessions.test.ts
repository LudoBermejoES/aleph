import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

/**
 * Arc detail page — "Linked Sessions" section.
 *
 * Regression cover for the bug where an arc's detail page showed none of its sessions.
 * The page used to call `api.getSessions({})` and filter client-side, which failed twice
 * over: the sessions endpoint is paginated (default page of 50, ordered by session number
 * descending, so the earliest arcs fell off page 1 entirely), and a paginated response is
 * a `{ data, meta }` envelope rather than an array, so `.filter` threw and aborted load().
 */

const arcDetailSource = readFileSync(
  resolve(__dirname, '../../../app/pages/campaigns/[id]/arcs/[slug]/index.vue'),
  'utf-8',
)

const arcListSource = readFileSync(
  resolve(__dirname, '../../../app/pages/campaigns/[id]/arcs/index.vue'),
  'utf-8',
)

describe('arc detail page asks the server for the arc’s sessions', () => {
  it('passes arcSlug so the filter happens in SQL', () => {
    expect(arcDetailSource).toContain('arcSlug: slug')
  })

  it('switches pagination off so no session is left on a later page', () => {
    expect(arcDetailSource).toMatch(/pageSize:\s*'0'/)
  })

  it('no longer fetches an unfiltered page of every session', () => {
    expect(arcDetailSource).not.toMatch(/getSessions\(\{\}\)/)
  })

  it('tolerates both the bare-array and the paginated response shape', () => {
    expect(arcDetailSource).toContain('Array.isArray(sessionsRes)')
  })

  it('still renders the Linked Sessions section from linkedSessions', () => {
    expect(arcDetailSource).toContain("$t('arcs.sessions')")
    expect(arcDetailSource).toContain('v-for="session in linkedSessions"')
  })
})

describe('arcs list page does not repeat the paginated-fetch mistake', () => {
  it('derives its per-arc count from the embedded chapters, not a session fetch', () => {
    expect(arcListSource).not.toContain('getSessions')
    expect(arcListSource).toContain('arc.chapters?.length ?? 0')
  })
})

// The unwrap + scope step the page performs on whatever the sessions endpoint returns.
// Mirrors `load()` in app/pages/campaigns/[id]/arcs/[slug]/index.vue.
interface Row {
  id: string
  arcId: string | null
}
function linkedSessionsFor(res: unknown, arcId: string): Row[] {
  const rows = Array.isArray(res)
    ? (res as Row[])
    : (((res as { data?: Row[] }).data ?? []) as Row[])
  return rows.filter((s) => s.arcId === arcId)
}

describe('linked-session extraction', () => {
  const a = { id: 's1', arcId: 'arc-a' }
  const b = { id: 's2', arcId: 'arc-a' }
  const other = { id: 's3', arcId: 'arc-b' }

  it('reads a bare array (pageSize=0)', () => {
    expect(linkedSessionsFor([a, b], 'arc-a')).toEqual([a, b])
  })

  it('reads a paginated envelope without throwing', () => {
    const res = { data: [a, b], meta: { page: 1, pageSize: 50, total: 2, totalPages: 1 } }
    expect(linkedSessionsFor(res, 'arc-a')).toEqual([a, b])
  })

  it('yields an empty list for an envelope with no data', () => {
    expect(linkedSessionsFor({ meta: { total: 0 } }, 'arc-a')).toEqual([])
  })

  it('keeps only the arc being viewed when a slug is duplicated', () => {
    expect(linkedSessionsFor([a, other, b], 'arc-a')).toEqual([a, b])
  })

  it('returns nothing for an arc with no sessions', () => {
    expect(linkedSessionsFor([other], 'arc-a')).toEqual([])
  })
})

describe('why the old client-side filter lost the earliest arcs', () => {
  // 73 sessions numbered 1..73, served newest-first in pages of 50.
  const all = Array.from({ length: 73 }, (_, i) => ({
    id: `s${73 - i}`,
    sessionNumber: 73 - i,
    arcId: 73 - i <= 5 ? 'earliest-arc' : 'later-arc',
  }))
  const pageOne = all.slice(0, 50)

  it('drops every session of the earliest arc from page 1', () => {
    expect(pageOne.filter((s) => s.arcId === 'earliest-arc')).toHaveLength(0)
    expect(pageOne.at(-1)!.sessionNumber).toBe(24)
  })

  it('finds them all once the server does the filtering', () => {
    expect(all.filter((s) => s.arcId === 'earliest-arc')).toHaveLength(5)
  })
})
