/**
 * Unit coverage for the diagram palette's group derivation.
 *
 * The bug this replaces: the palette's generic group was queried as
 * `entities.type IN ('entity','wiki')` — two type values NO campaign in this database has ever
 * used. The group was therefore always empty, the panel drops empty groups, and so a third of the
 * campaign (120 of 372 entities: 99 sessions, 13 arcs, 5 lore, 3 items) could not be placed on a
 * diagram while the palette looked complete.
 *
 * These tests are written from the RULE — *the palette offers every entity type the campaign
 * holds* — not from the implementation. In particular the fixtures use the REAL vocabulary
 * measured on `berlin-en-tinieblas`, where the two sources of truth disagree in both directions:
 * `faction`/`event`/`note` are declared and unused, `organization`/`arc` are used and undeclared.
 * A fixture where the two agreed could not fail either version of this code.
 */
import { describe, it, expect } from 'vitest'
import {
  buildPaletteGroups,
  fanoutTypeSlugs,
  BUILTIN_GROUP_KEYS,
} from '../../../server/utils/diagram-palette'

/** The nine types `berlin-en-tinieblas` declares, in its own sortOrder. */
const DECLARED = [
  { slug: 'character', name: 'Character', sortOrder: 1 },
  { slug: 'location', name: 'Location', sortOrder: 2 },
  { slug: 'faction', name: 'Faction', sortOrder: 3 },
  { slug: 'item', name: 'Item', sortOrder: 4 },
  { slug: 'event', name: 'Event', sortOrder: 5 },
  { slug: 'lore', name: 'Lore', sortOrder: 6 },
  { slug: 'quest', name: 'Quest', sortOrder: 7 },
  { slug: 'note', name: 'Note', sortOrder: 8 },
  { slug: 'session', name: 'Session', sortOrder: 9 },
]

/** The eight types its entities actually carry. Note `arc` and `organization`. */
const PRESENT = ['character', 'session', 'location', 'organization', 'arc', 'quest', 'lore', 'item']

describe('buildPaletteGroups', () => {
  it('offers a group for objects — the defect that started this', () => {
    const keys = buildPaletteGroups(DECLARED, PRESENT).map((g) => g.key)
    expect(keys).toContain('item')
  })

  it('offers a group for every type the campaign holds, declared or not', () => {
    const keys = new Set(buildPaletteGroups(DECLARED, PRESENT).map((g) => g.key))
    // Declared-and-unused still get a group: creating the first entity of that type must not
    // require a code change.
    for (const slug of ['item', 'event', 'lore', 'note', 'session']) {
      expect(keys, `declared type ${slug}`).toContain(slug)
    }
    // Used-but-undeclared too. `arc` is the one this would have missed if the derivation read
    // `entity_types` alone — 13 real entities.
    expect(keys, 'undeclared but in use').toContain('arc')
  })

  it('puts the four built-in groups first, in their fixed order', () => {
    const groups = buildPaletteGroups(DECLARED, PRESENT)
    expect(groups.slice(0, 4).map((g) => g.key)).toEqual([...BUILTIN_GROUP_KEYS])
    expect(groups.slice(0, 4).every((g) => g.builtin)).toBe(true)
  })

  it('orders the campaign types by the campaign own sortOrder, not alphabetically', () => {
    const extras = buildPaletteGroups(DECLARED, PRESENT)
      .filter((g) => !g.builtin)
      .map((g) => g.key)
    // item(4) < event(5) < lore(6) < note(8) < session(9); alphabetical would be event, item, ...
    expect(extras.slice(0, 5)).toEqual(['item', 'event', 'lore', 'note', 'session'])
  })

  it('never emits a type a built-in group already serves', () => {
    const extras = buildPaletteGroups(DECLARED, PRESENT).filter((g) => !g.builtin)
    for (const forbidden of ['character', 'location', 'quest']) {
      expect(extras.map((g) => g.key)).not.toContain(forbidden)
    }
  })

  it('excludes BOTH spellings of organization, so organizations are not listed twice', () => {
    // The trap: `entity_types.slug` is `faction` while `entities.type` is `organization`. Excluding
    // one spelling only lets the other through, and every organization appears in two groups.
    const extras = buildPaletteGroups(DECLARED, PRESENT).map((g) => g.key)
    expect(extras).not.toContain('faction')
    expect(extras).not.toContain('organization')
  })

  it('shows a renamed type under its new name, verbatim', () => {
    const renamed = DECLARED.map((t) => (t.slug === 'item' ? { ...t, name: 'Reliquias' } : t))
    const group = buildPaletteGroups(renamed, PRESENT).find((g) => g.key === 'item')
    expect(group).toEqual({ key: 'item', label: 'Reliquias', builtin: false })
  })

  it('labels an undeclared type with its slug, since no DM ever named it', () => {
    const group = buildPaletteGroups(DECLARED, PRESENT).find((g) => g.key === 'arc')
    expect(group).toEqual({ key: 'arc', label: 'arc', builtin: false })
  })

  it('collapses a duplicated type row instead of rendering the same entities twice', () => {
    // `entity_types` has no unique index on (campaign_id, slug) — verified against migration
    // 0000_lethal_mephistopheles.sql — so a duplicate is representable.
    const dup = [...DECLARED, { slug: 'item', name: 'Item (copia)', sortOrder: 99 }]
    const items = buildPaletteGroups(dup, PRESENT).filter((g) => g.key === 'item')
    expect(items).toHaveLength(1)
    expect(items[0]!.label).toBe('Item')
  })

  it('refuses a type whose slug would overwrite a reserved response key', () => {
    // The response is a flat map of key -> entities plus `groups` metadata. A campaign type called
    // `groups` or `wiki` would clobber it, so it is skipped rather than allowed to corrupt it.
    const hostile = [
      { slug: 'groups', name: 'Groups', sortOrder: 1 },
      { slug: 'wiki', name: 'Wiki', sortOrder: 2 },
      { slug: 'characters', name: 'Characters', sortOrder: 3 },
    ]
    const extras = buildPaletteGroups(hostile, []).filter((g) => !g.builtin)
    expect(extras).toEqual([])
  })

  it('a campaign with no types at all still offers the four built-in groups', () => {
    const groups = buildPaletteGroups([], [])
    expect(groups.map((g) => g.key)).toEqual([...BUILTIN_GROUP_KEYS])
  })

  it('ignores an empty slug rather than emitting a group with no key', () => {
    const groups = buildPaletteGroups([{ slug: '', name: 'Sin nombre', sortOrder: 1 }], [''])
    expect(groups.filter((g) => !g.builtin)).toEqual([])
  })
})

describe('fanoutTypeSlugs', () => {
  it('returns exactly the non-built-in group keys, in group order', () => {
    const groups = buildPaletteGroups(DECLARED, PRESENT)
    expect(fanoutTypeSlugs(DECLARED, PRESENT)).toEqual(
      groups.filter((g) => !g.builtin).map((g) => g.key),
    )
  })

  it('includes item and arc, and excludes the built-in types', () => {
    const slugs = fanoutTypeSlugs(DECLARED, PRESENT)
    expect(slugs).toContain('item')
    expect(slugs).toContain('arc')
    expect(slugs).not.toContain('character')
    expect(slugs).not.toContain('organization')
  })
})
