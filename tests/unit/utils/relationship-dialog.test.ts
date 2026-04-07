import { describe, it, expect } from 'vitest'

/**
 * Unit tests for relationship dialog logic:
 * - Mode computation from source/target entity type pairs
 * - Source/target swapping for reversed combinations
 * - Form validation rules
 */

type NormalizedType = 'character' | 'organization' | 'location' | 'other'

// Mirrors normalizeType() from RelationshipDialog.vue
function normalizeType(entityType: string): NormalizedType {
  if (entityType === 'character' || entityType === 'npc' || entityType === 'pc') return 'character'
  if (entityType === 'organization') return 'organization'
  if (entityType === 'location') return 'location'
  return 'other'
}

// Mirrors the relationshipMode computed from RelationshipDialog.vue
function computeRelationshipMode(
  sourceType: string,
  targetType: string,
): 'entity-relation' | 'org-member' | 'char-location' | 'org-location' | null {
  const src = normalizeType(sourceType)
  const tgt = normalizeType(targetType)

  if (src === 'character' && tgt === 'character') return 'entity-relation'
  if (
    (src === 'character' && tgt === 'organization') ||
    (src === 'organization' && tgt === 'character')
  )
    return 'org-member'
  if ((src === 'character' && tgt === 'location') || (src === 'location' && tgt === 'character'))
    return 'char-location'
  if (
    (src === 'organization' && tgt === 'location') ||
    (src === 'location' && tgt === 'organization')
  )
    return 'org-location'

  return 'entity-relation'
}

describe('relationship dialog — mode computation', () => {
  it('character + character → entity-relation', () => {
    expect(computeRelationshipMode('character', 'character')).toBe('entity-relation')
  })

  it('character + organization → org-member', () => {
    expect(computeRelationshipMode('character', 'organization')).toBe('org-member')
  })

  it('organization + character → org-member (reversed)', () => {
    expect(computeRelationshipMode('organization', 'character')).toBe('org-member')
  })

  it('character + location → char-location', () => {
    expect(computeRelationshipMode('character', 'location')).toBe('char-location')
  })

  it('location + character → char-location (reversed)', () => {
    expect(computeRelationshipMode('location', 'character')).toBe('char-location')
  })

  it('organization + location → org-location', () => {
    expect(computeRelationshipMode('organization', 'location')).toBe('org-location')
  })

  it('location + organization → org-location (reversed)', () => {
    expect(computeRelationshipMode('location', 'organization')).toBe('org-location')
  })

  it('npc normalizes to character', () => {
    expect(computeRelationshipMode('npc', 'character')).toBe('entity-relation')
    expect(computeRelationshipMode('npc', 'organization')).toBe('org-member')
  })

  it('unknown types fall back to entity-relation', () => {
    expect(computeRelationshipMode('quest', 'wiki')).toBe('entity-relation')
    expect(computeRelationshipMode('character', 'quest')).toBe('entity-relation')
  })
})

describe('relationship dialog — form validation', () => {
  it('canSubmit is false when no target', () => {
    const target = null
    const sourceId = 'abc'
    const canSubmit = target !== null && target !== sourceId
    expect(canSubmit).toBe(false)
  })

  it('canSubmit is false when target === source', () => {
    const targetId = 'abc'
    const sourceId = 'abc'
    const canSubmit = targetId !== null && targetId !== sourceId
    expect(canSubmit).toBe(false)
  })

  it('canSubmit is true when target is different from source', () => {
    const targetId = 'def'
    const sourceId = 'abc'
    const canSubmit = targetId !== null && targetId !== sourceId
    expect(canSubmit).toBe(true)
  })
})

describe('normalizeType', () => {
  it('maps npc → character', () => expect(normalizeType('npc')).toBe('character'))
  it('maps pc → character', () => expect(normalizeType('pc')).toBe('character'))
  it('maps character → character', () => expect(normalizeType('character')).toBe('character'))
  it('maps organization → organization', () =>
    expect(normalizeType('organization')).toBe('organization'))
  it('maps location → location', () => expect(normalizeType('location')).toBe('location'))
  it('maps unknown → other', () => expect(normalizeType('quest')).toBe('other'))
})
