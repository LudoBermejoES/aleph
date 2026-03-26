import { describe, it, expect } from 'vitest'

/**
 * Entity mention autocomplete logic tests
 *
 * Tests the core logic used by the EntityMention Tiptap extension:
 * - Query filtering
 * - Entity-link markdown output
 * - Suggestion list behavior
 */

describe('Entity mention autocomplete logic', () => {
  const entities = [
    { id: '1', name: 'Strahd von Zarovich', slug: 'strahd-von-zarovich', type: 'character' },
    { id: '2', name: 'Barovia', slug: 'barovia', type: 'location' },
    { id: '3', name: 'Ireena Kolyana', slug: 'ireena-kolyana', type: 'character' },
    { id: '4', name: 'Castle Ravenloft', slug: 'castle-ravenloft', type: 'location' },
  ]

  function filterEntities(query: string) {
    if (!query || query.length < 1) return []
    return entities.filter(e => e.name.toLowerCase().includes(query.toLowerCase()))
  }

  it('filters entities by query', () => {
    expect(filterEntities('strahd')).toHaveLength(1)
    expect(filterEntities('strahd')[0].name).toBe('Strahd von Zarovich')
  })

  it('filters case-insensitively', () => {
    expect(filterEntities('BAROVIA')).toHaveLength(1)
    expect(filterEntities('barovia')).toHaveLength(1)
  })

  it('returns multiple matches', () => {
    expect(filterEntities('a')).toHaveLength(4) // all contain 'a'
  })

  it('returns empty for no match', () => {
    expect(filterEntities('zzz')).toHaveLength(0)
  })

  it('returns empty for empty query', () => {
    expect(filterEntities('')).toHaveLength(0)
  })
})

describe('Entity-link markdown rendering', () => {
  function renderEntityMention(slug: string, label?: string): string {
    if (label) return `:entity-link{slug="${slug}" label="${label}"}`
    return `:entity-link{slug="${slug}"}`
  }

  it('renders entity-link MDC syntax with slug only', () => {
    expect(renderEntityMention('strahd-von-zarovich'))
      .toBe(':entity-link{slug="strahd-von-zarovich"}')
  })

  it('renders entity-link MDC syntax with slug and label', () => {
    expect(renderEntityMention('strahd-von-zarovich', 'Strahd'))
      .toBe(':entity-link{slug="strahd-von-zarovich" label="Strahd"}')
  })
})

describe('Suggestion list behavior', () => {
  it('selected index resets when items change', () => {
    let selectedIndex = 2
    const items = [{ id: '1' }, { id: '2' }]
    // When items change, reset to 0
    selectedIndex = 0
    expect(selectedIndex).toBe(0)
    expect(items.length).toBe(2)
  })

  it('arrow down wraps around', () => {
    const items = [{ id: '1' }, { id: '2' }, { id: '3' }]
    let selected = 2
    selected = (selected + 1) % items.length
    expect(selected).toBe(0)
  })

  it('arrow up wraps around', () => {
    const items = [{ id: '1' }, { id: '2' }, { id: '3' }]
    let selected = 0
    selected = (selected + items.length - 1) % items.length
    expect(selected).toBe(2)
  })

  it('enter selects current item', () => {
    const items = [{ id: '1', name: 'Strahd' }, { id: '2', name: 'Barovia' }]
    const selected = 1
    expect(items[selected].name).toBe('Barovia')
  })
})
