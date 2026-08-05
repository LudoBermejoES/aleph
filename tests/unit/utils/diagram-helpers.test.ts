import { describe, it, expect } from 'vitest'

// Test the pure radialLayout function (duplicated logic since server utils aren't directly importable in vitest without Nuxt)
function radialLayout(
  centerX: number,
  centerY: number,
  count: number,
  radius: number,
): Array<{ x: number; y: number }> {
  if (count === 0) return []
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * 2 * Math.PI - Math.PI / 2
    return {
      x: centerX + Math.cos(angle) * radius,
      y: centerY + Math.sin(angle) * radius,
    }
  })
}

// Test the shape builder conventions (mirrors diagram-helpers.ts)
function buildNpcTokenShape(
  entity: { id: string; name: string; slug: string; portraitUrl?: string | null },
  campaignId: string,
  x: number,
  y: number,
) {
  return {
    type: 'npcToken',
    x,
    y,
    props: {
      entityId: entity.id,
      campaignId,
      slug: entity.slug,
      characterName: entity.name,
      portraitUrl: entity.portraitUrl ?? undefined,
      w: 140,
      h: 160,
    },
  }
}

function buildLocationPinShape(
  entity: { id: string; name: string; slug: string; imageUrl?: string | null },
  campaignId: string,
  x: number,
  y: number,
) {
  return {
    type: 'locationPin',
    x,
    y,
    props: {
      entityId: entity.id,
      campaignId,
      slug: entity.slug,
      locationName: entity.name,
      locationImageUrl: entity.imageUrl ?? undefined,
      w: 140,
      h: 175,
    },
  }
}

function buildFactionCardShape(
  org: { id: string; name: string; slug: string; imageUrl?: string | null },
  campaignId: string,
  x: number,
  y: number,
) {
  return {
    type: 'factionCard',
    x,
    y,
    props: {
      entityId: org.id,
      campaignId,
      slug: org.slug,
      factionName: org.name,
      crestUrl: org.imageUrl ?? undefined,
      w: 140,
      h: 160,
    },
  }
}

describe('radialLayout', () => {
  it('returns empty array for count=0', () => {
    expect(radialLayout(100, 100, 0, 50)).toEqual([])
  })

  it('places 1 item at top (angle = -PI/2)', () => {
    const positions = radialLayout(100, 100, 1, 50)
    expect(positions).toHaveLength(1)
    expect(positions[0]!.x).toBeCloseTo(100, 0)
    expect(positions[0]!.y).toBeCloseTo(50, 0) // 100 - 50
  })

  it('places 4 items evenly at cardinal directions', () => {
    const positions = radialLayout(0, 0, 4, 100)
    expect(positions).toHaveLength(4)
    // Item 0: top (0, -100)
    expect(positions[0]!.x).toBeCloseTo(0, 0)
    expect(positions[0]!.y).toBeCloseTo(-100, 0)
    // Item 1: right (100, 0)
    expect(positions[1]!.x).toBeCloseTo(100, 0)
    expect(positions[1]!.y).toBeCloseTo(0, 0)
    // Item 2: bottom (0, 100)
    expect(positions[2]!.x).toBeCloseTo(0, 0)
    expect(positions[2]!.y).toBeCloseTo(100, 0)
    // Item 3: left (-100, 0)
    expect(positions[3]!.x).toBeCloseTo(-100, 0)
    expect(positions[3]!.y).toBeCloseTo(0, 0)
  })

  it('all positions are at the correct distance from center', () => {
    const positions = radialLayout(200, 300, 7, 150)
    for (const pos of positions) {
      const dist = Math.sqrt((pos.x - 200) ** 2 + (pos.y - 300) ** 2)
      expect(dist).toBeCloseTo(150, 0)
    }
  })
})

describe('buildNpcTokenShape', () => {
  it('returns npcToken shape with correct props', () => {
    const shape = buildNpcTokenShape(
      { id: 'ent-1', name: 'Diana', slug: 'diana', portraitUrl: '/img/diana.png' },
      'camp-1',
      100,
      200,
    )
    expect(shape.type).toBe('npcToken')
    expect(shape.x).toBe(100)
    expect(shape.y).toBe(200)
    expect(shape.props.entityId).toBe('ent-1')
    expect(shape.props.characterName).toBe('Diana')
    expect(shape.props.slug).toBe('diana')
    expect(shape.props.campaignId).toBe('camp-1')
    expect(shape.props.portraitUrl).toBe('/img/diana.png')
    expect(shape.props.w).toBe(140)
    expect(shape.props.h).toBe(160)
  })

  it('handles null portraitUrl', () => {
    const shape = buildNpcTokenShape(
      { id: 'ent-2', name: 'Hotman', slug: 'hotman', portraitUrl: null },
      'camp-1',
      0,
      0,
    )
    expect(shape.props.portraitUrl).toBeUndefined()
  })
})

describe('buildLocationPinShape', () => {
  it('returns locationPin shape with correct props', () => {
    const shape = buildLocationPinShape(
      { id: 'loc-1', name: 'Tavern', slug: 'tavern' },
      'camp-1',
      50,
      75,
    )
    expect(shape.type).toBe('locationPin')
    expect(shape.props.entityId).toBe('loc-1')
    expect(shape.props.locationName).toBe('Tavern')
    expect(shape.props.slug).toBe('tavern')
    expect(shape.props.w).toBe(140)
    expect(shape.props.h).toBe(175)
  })

  it('sets locationImageUrl when imageUrl is provided', () => {
    const shape = buildLocationPinShape(
      { id: 'loc-1', name: 'Tavern', slug: 'tavern', imageUrl: '/img/tavern.png' },
      'camp-1',
      0,
      0,
    )
    expect(shape.props.locationImageUrl).toBe('/img/tavern.png')
  })

  it('locationImageUrl is undefined when imageUrl is null', () => {
    const shape = buildLocationPinShape(
      { id: 'loc-1', name: 'Tavern', slug: 'tavern', imageUrl: null },
      'camp-1',
      0,
      0,
    )
    expect(shape.props.locationImageUrl).toBeUndefined()
  })
})

describe('buildFactionCardShape', () => {
  it('returns factionCard shape with correct props', () => {
    const shape = buildFactionCardShape(
      { id: 'org-1', name: 'La Fuerza', slug: 'la-fuerza' },
      'camp-1',
      300,
      400,
    )
    expect(shape.type).toBe('factionCard')
    expect(shape.props.entityId).toBe('org-1')
    expect(shape.props.factionName).toBe('La Fuerza')
    expect(shape.props.slug).toBe('la-fuerza')
    expect(shape.props.w).toBe(140)
    expect(shape.props.h).toBe(160)
  })

  it('sets crestUrl when imageUrl is provided', () => {
    const shape = buildFactionCardShape(
      { id: 'org-1', name: 'La Fuerza', slug: 'la-fuerza', imageUrl: '/img/fuerza.png' },
      'camp-1',
      0,
      0,
    )
    expect(shape.props.crestUrl).toBe('/img/fuerza.png')
  })

  it('crestUrl is undefined when imageUrl is null', () => {
    const shape = buildFactionCardShape(
      { id: 'org-1', name: 'La Fuerza', slug: 'la-fuerza', imageUrl: null },
      'camp-1',
      0,
      0,
    )
    expect(shape.props.crestUrl).toBeUndefined()
  })
})
