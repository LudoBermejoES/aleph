import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

import { findArcRef, flattenChapters } from '../../../cli/src/lib/arcs.js'

const source = readFileSync(resolve(__dirname, '../../../cli/src/commands/chapter.js'), 'utf-8')

/** Shape of GET /api/campaigns/:id/arcs — arcs ordered by sortOrder, chapters nested. */
const arcsPayload = [
  {
    id: 'arc-1',
    slug: 'act-i',
    name: 'Act I',
    sortOrder: 0,
    chapters: [
      { id: 'ch-2', slug: 'the-market', name: 'The Market', arcId: 'arc-1', sortOrder: 1 },
      { id: 'ch-1', slug: 'the-siege', name: 'The Siege', arcId: 'arc-1', sortOrder: 0 },
    ],
  },
  {
    id: 'arc-2',
    slug: 'act-ii',
    name: 'Act II',
    sortOrder: 1,
    chapters: [{ id: 'ch-3', slug: 'the-fall', name: 'The Fall', arcId: 'arc-2', sortOrder: 0 }],
  },
  { id: 'arc-3', slug: 'act-iii', name: 'Act III', sortOrder: 2, chapters: [] },
]

describe('flattenChapters', () => {
  it('yields one row per chapter across every arc', () => {
    const rows = flattenChapters(arcsPayload)
    expect(rows.map((r) => r.slug)).toEqual(['the-siege', 'the-market', 'the-fall'])
  })

  it('orders by arc (server order) then by chapter sortOrder', () => {
    const rows = flattenChapters(arcsPayload)
    expect(rows.map((r) => [r.arcSlug, r.sortOrder])).toEqual([
      ['act-i', 0],
      ['act-i', 1],
      ['act-ii', 0],
    ])
  })

  it('carries the arc name so the table never shows a raw arcId', () => {
    const rows = flattenChapters(arcsPayload)
    expect(rows[0].arcName).toBe('Act I')
    expect(rows[2].arcName).toBe('Act II')
  })

  it('keeps every chapter field for --json output', () => {
    const [row] = flattenChapters(arcsPayload)
    expect(row).toMatchObject({
      id: 'ch-1',
      slug: 'the-siege',
      name: 'The Siege',
      arcId: 'arc-1',
      arcSlug: 'act-i',
      arcName: 'Act I',
      sortOrder: 0,
    })
  })

  it('narrows to a single arc by slug', () => {
    const rows = flattenChapters(arcsPayload, 'act-ii')
    expect(rows.map((r) => r.slug)).toEqual(['the-fall'])
  })

  it('narrows to a single arc by id as well', () => {
    const rows = flattenChapters(arcsPayload, 'arc-1')
    expect(rows.map((r) => r.slug)).toEqual(['the-siege', 'the-market'])
  })

  it('returns an empty list for an arc with no chapters', () => {
    expect(flattenChapters(arcsPayload, 'act-iii')).toEqual([])
  })

  it('returns an empty list for an unknown arc rather than throwing', () => {
    expect(flattenChapters(arcsPayload, 'nope')).toEqual([])
  })

  it('tolerates a missing/odd payload', () => {
    expect(flattenChapters(undefined as never)).toEqual([])
    expect(flattenChapters([{ id: 'a', slug: 's', name: 'n' }] as never)).toEqual([])
  })

  it('defaults a missing sortOrder to 0', () => {
    const rows = flattenChapters([
      { id: 'a', slug: 'a', name: 'A', chapters: [{ id: 'c', slug: 'c', name: 'C' }] },
    ] as never)
    expect(rows[0].sortOrder).toBe(0)
  })
})

describe('findArcRef', () => {
  it('matches by slug', () => {
    expect(findArcRef(arcsPayload, 'act-ii')?.id).toBe('arc-2')
  })

  it('falls back to matching by id', () => {
    expect(findArcRef(arcsPayload, 'arc-3')?.slug).toBe('act-iii')
  })

  it('prefers a slug match over an id match', () => {
    const list = [
      { id: 'act-i', slug: 'other', name: 'Other' },
      { id: 'real-id', slug: 'act-i', name: 'Act I' },
    ]
    expect(findArcRef(list, 'act-i')?.id).toBe('real-id')
  })

  it('returns null for an unknown reference', () => {
    expect(findArcRef(arcsPayload, 'nope')).toBeNull()
    expect(findArcRef(arcsPayload, '')).toBeNull()
  })
})

describe('chapter list command wiring', () => {
  it('reads the arcs endpoint instead of the chapters endpoint (which requires arc_id)', () => {
    expect(source).toContain('await get(`/api/campaigns/${opts.campaign}/arcs`)')
    expect(source).not.toContain('/chapters?arc_id')
  })

  it('has no required --arc option on list', () => {
    expect(source).toContain("'--arc <slug>', 'Only chapters of this arc (arc slug or id)'")
    expect(source).not.toContain("requiredOption('--arc")
  })

  it('shows slug, name, arc name and sort order', () => {
    expect(source).toContain('arc: c.arcName')
    expect(source).toContain('sortOrder: c.sortOrder')
    expect(source).not.toContain('arc: c.arcId')
  })
})

describe('chapter create --arc resolution', () => {
  it('resolves a slug (or id) to an arcId before posting', () => {
    expect(source).toContain('body.arcId = await resolveArcId(opts.campaign, opts.arc)')
    expect(source).toContain('findArcRef(arcList, ref)')
  })

  it('reports an unknown arc reference and exits non-zero', () => {
    expect(source).toContain('not found in this campaign')
    expect(source).toContain('process.exit(2)')
  })
})
