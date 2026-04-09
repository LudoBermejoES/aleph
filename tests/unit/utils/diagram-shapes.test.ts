import { describe, it, expect } from 'vitest'
import {
  ENTITY_TYPE_TO_SHAPE_TYPE,
  ENTITY_SHAPE_TYPES,
  getShapeType,
  getEntityTypeFromShape,
  buildShapeCreateArgs,
} from '../../../app/utils/diagram-shapes'

describe('getShapeType', () => {
  it('maps known entity types', () => {
    expect(getShapeType('character')).toBe('npcToken')
    expect(getShapeType('location')).toBe('locationPin')
    expect(getShapeType('quest')).toBe('questNode')
    expect(getShapeType('organization')).toBe('factionCard')
    expect(getShapeType('wiki')).toBe('entityCard')
  })

  it('falls back to entityCard for unknown types', () => {
    expect(getShapeType('unknown')).toBe('entityCard')
    expect(getShapeType('')).toBe('entityCard')
  })
})

describe('getEntityTypeFromShape', () => {
  it('resolves shape types to entity types', () => {
    expect(getEntityTypeFromShape('npcToken')).toBe('character')
    expect(getEntityTypeFromShape('factionCard')).toBe('organization')
    expect(getEntityTypeFromShape('locationPin')).toBe('location')
    expect(getEntityTypeFromShape('questNode')).toBe('quest')
    expect(getEntityTypeFromShape('entityCard')).toBe('entity')
  })
})

describe('ENTITY_SHAPE_TYPES', () => {
  it('includes all entity shape types', () => {
    expect(ENTITY_SHAPE_TYPES).toContain('npcToken')
    expect(ENTITY_SHAPE_TYPES).toContain('locationPin')
    expect(ENTITY_SHAPE_TYPES).toContain('factionCard')
    expect(ENTITY_SHAPE_TYPES).toContain('questNode')
    expect(ENTITY_SHAPE_TYPES).toContain('entityCard')
  })

  it('does not include non-entity shapes', () => {
    expect(ENTITY_SHAPE_TYPES).not.toContain('arrow')
    expect(ENTITY_SHAPE_TYPES).not.toContain('regionBox')
  })
})

describe('ENTITY_TYPE_TO_SHAPE_TYPE', () => {
  it('is a complete mapping', () => {
    expect(Object.keys(ENTITY_TYPE_TO_SHAPE_TYPE)).toEqual(
      expect.arrayContaining(['character', 'location', 'quest', 'organization', 'wiki']),
    )
  })
})

describe('buildShapeCreateArgs', () => {
  const campaignId = 'camp-1'

  it('builds npcToken for character', () => {
    const result = buildShapeCreateArgs(
      'character',
      { id: 'e1', name: 'Diana', slug: 'diana', portraitUrl: '/img/diana.png' },
      campaignId,
    )
    expect(result.type).toBe('npcToken')
    expect(result.props.entityId).toBe('e1')
    expect(result.props.campaignId).toBe('camp-1')
    expect(result.props.slug).toBe('diana')
    expect(result.props.characterName).toBe('Diana')
    expect(result.props.portraitUrl).toBe('/img/diana.png')
    expect(result.props.w).toBe(140)
    expect(result.props.h).toBe(160)
  })

  it('builds locationPin for location', () => {
    const result = buildShapeCreateArgs(
      'location',
      { id: 'loc1', name: 'Tavern', slug: 'tavern' },
      campaignId,
    )
    expect(result.type).toBe('locationPin')
    expect(result.props.locationName).toBe('Tavern')
    expect(result.props.w).toBe(180)
    expect(result.props.h).toBe(60)
  })

  it('builds factionCard for organization', () => {
    const result = buildShapeCreateArgs(
      'organization',
      { id: 'org1', name: 'La Fuerza', slug: 'la-fuerza' },
      campaignId,
    )
    expect(result.type).toBe('factionCard')
    expect(result.props.factionName).toBe('La Fuerza')
    expect(result.props.w).toBe(140)
    expect(result.props.h).toBe(160)
  })

  it('builds factionCard with crestUrl from image', () => {
    const result = buildShapeCreateArgs(
      'organization',
      { id: 'org1', name: 'La Fuerza', slug: 'la-fuerza', image: '/img/fuerza.png' },
      campaignId,
    )
    expect(result.props.crestUrl).toBe('/img/fuerza.png')
  })

  it('builds questNode for quest', () => {
    const result = buildShapeCreateArgs(
      'quest',
      { id: 'q1', name: 'Main Quest', slug: 'main', status: 'active' },
      campaignId,
    )
    expect(result.type).toBe('questNode')
    expect(result.props.questTitle).toBe('Main Quest')
    expect(result.props.status).toBe('active')
  })

  it('builds entityCard for unknown type', () => {
    const result = buildShapeCreateArgs(
      'artifact',
      { id: 'a1', name: 'Sword', slug: 'sword' },
      campaignId,
    )
    expect(result.type).toBe('entityCard')
    expect(result.props.entityName).toBe('Sword')
    expect(result.props.entityType).toBe('artifact')
  })

  it('handles null portraitUrl', () => {
    const result = buildShapeCreateArgs(
      'character',
      { id: 'e1', name: 'Hero', slug: 'hero', portraitUrl: null },
      campaignId,
    )
    expect(result.props.portraitUrl).toBeUndefined()
  })

  it('uses image field as fallback for portraitUrl', () => {
    const result = buildShapeCreateArgs(
      'character',
      { id: 'e1', name: 'Hero', slug: 'hero', image: '/img/hero.png' },
      campaignId,
    )
    expect(result.props.portraitUrl).toBe('/img/hero.png')
  })
})
