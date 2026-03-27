import { describe, it, expect } from 'vitest'

// Inline the same logic as in the character detail page
function computeAttitudeColor(score: number | null | undefined): string {
  if (score === null || score === undefined || score === 0) return '#9ca3af'
  const clamped = Math.max(-100, Math.min(100, score))
  if (clamped < 0) {
    const t = Math.abs(clamped) / 100
    const r = Math.round(156 + t * (239 - 156))
    const g = Math.round(163 - t * (163 - 68))
    const b = Math.round(175 - t * (175 - 68))
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
  }
  const t = clamped / 100
  const r = Math.round(156 - t * (156 - 34))
  const g = Math.round(163 + t * (197 - 163))
  const b = Math.round(175 - t * (175 - 94))
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

describe('computeAttitudeColor (character page inline helper)', () => {
  it('returns gray for 0', () => {
    expect(computeAttitudeColor(0)).toBe('#9ca3af')
  })

  it('returns gray for null', () => {
    expect(computeAttitudeColor(null)).toBe('#9ca3af')
  })

  it('returns gray for undefined', () => {
    expect(computeAttitudeColor(undefined)).toBe('#9ca3af')
  })

  it('returns a reddish hex for -100', () => {
    const color = computeAttitudeColor(-100)
    expect(color).toMatch(/^#[0-9a-f]{6}$/)
    // Red channel should be dominant (EF hex = 239 decimal)
    expect(parseInt(color.slice(1, 3), 16)).toBeGreaterThan(200)
  })

  it('returns a greenish hex for +100', () => {
    const color = computeAttitudeColor(100)
    expect(color).toMatch(/^#[0-9a-f]{6}$/)
    // Green channel should be dominant
    expect(parseInt(color.slice(3, 5), 16)).toBeGreaterThan(150)
  })

  it('clamps values below -100', () => {
    expect(computeAttitudeColor(-200)).toBe(computeAttitudeColor(-100))
  })

  it('clamps values above +100', () => {
    expect(computeAttitudeColor(200)).toBe(computeAttitudeColor(100))
  })

  it('produces different colors for different attitudes', () => {
    expect(computeAttitudeColor(-50)).not.toBe(computeAttitudeColor(50))
    expect(computeAttitudeColor(-50)).not.toBe('#9ca3af')
    expect(computeAttitudeColor(50)).not.toBe('#9ca3af')
  })

  it('produces intermediate shades between 0 and extremes', () => {
    const neutral = computeAttitudeColor(0)
    const mild = computeAttitudeColor(30)
    const strong = computeAttitudeColor(100)
    expect(mild).not.toBe(neutral)
    expect(mild).not.toBe(strong)
  })
})

describe('graphData shape helpers', () => {
  // Helpers that mirror what graphData computed does in the page
  function buildGraphNodes(
    center: { entityId: string; name: string; portraitUrl?: string | null },
    relations: { relatedEntityId: string; relatedEntityName?: string; relatedEntityType?: string; image?: string | null }[],
    connections: { targetEntityId: string; targetEntityName?: string; targetEntityType?: string }[],
  ) {
    const nodes: Record<string, { name: string; type: string; image?: string | null }> = {}
    nodes[center.entityId] = { name: center.name, type: 'character', image: center.portraitUrl ?? null }
    for (const rel of relations) {
      nodes[rel.relatedEntityId] = {
        name: rel.relatedEntityName ?? rel.relatedEntityId,
        type: rel.relatedEntityType ?? 'character',
        image: rel.image ?? null,
      }
    }
    for (const conn of connections) {
      if (!nodes[conn.targetEntityId]) {
        nodes[conn.targetEntityId] = {
          name: conn.targetEntityName ?? conn.targetEntityId,
          type: conn.targetEntityType ?? 'character',
          image: null,
        }
      }
    }
    return nodes
  }

  it('includes center node', () => {
    const nodes = buildGraphNodes({ entityId: 'e1', name: 'Diana' }, [], [])
    expect(nodes['e1']).toEqual({ name: 'Diana', type: 'character', image: null })
  })

  it('includes portrait url on center node when available', () => {
    const nodes = buildGraphNodes({ entityId: 'e1', name: 'Diana', portraitUrl: '/api/portrait/diana' }, [], [])
    expect(nodes['e1'].image).toBe('/api/portrait/diana')
  })

  it('adds relation nodes', () => {
    const nodes = buildGraphNodes(
      { entityId: 'e1', name: 'Diana' },
      [{ relatedEntityId: 'e2', relatedEntityName: 'Psique', relatedEntityType: 'character' }],
      [],
    )
    expect(nodes['e2']).toBeDefined()
    expect(nodes['e2'].name).toBe('Psique')
    expect(nodes['e2'].type).toBe('character')
  })

  it('adds connection nodes without duplicating existing relation nodes', () => {
    const nodes = buildGraphNodes(
      { entityId: 'e1', name: 'Diana' },
      [{ relatedEntityId: 'e2', relatedEntityName: 'Hotman', relatedEntityType: 'character' }],
      [{ targetEntityId: 'e2', targetEntityName: 'Hotman (conn)' }],
    )
    // Connection should NOT overwrite the relation node already present
    expect(nodes['e2'].name).toBe('Hotman')
  })

  it('returns null image for connection-only nodes', () => {
    const nodes = buildGraphNodes(
      { entityId: 'e1', name: 'Diana' },
      [],
      [{ targetEntityId: 'e3', targetEntityName: 'Some Entity' }],
    )
    expect(nodes['e3'].image).toBeNull()
  })
})
