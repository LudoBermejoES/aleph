import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  getRelationLabel,
  validateRelationType,
  computeAttitudeColor,
  BUILTIN_RELATION_TYPES,
} from '../../../server/services/relationships'
import { createTestDb, type TestDb } from '../../helpers/db'

describe('getRelationLabel', () => {
  const relation = {
    sourceEntityId: 'entity-a',
    targetEntityId: 'entity-b',
    forwardLabel: 'parent of',
    reverseLabel: 'child of',
  }

  it('returns forward label when queried from source', () => {
    expect(getRelationLabel(relation, 'entity-a')).toBe('parent of')
  })

  it('returns reverse label when queried from target', () => {
    expect(getRelationLabel(relation, 'entity-b')).toBe('child of')
  })

  it('returns forward label for unrelated entity', () => {
    expect(getRelationLabel(relation, 'entity-c')).toBe('parent of')
  })

  it('handles symmetric relations', () => {
    const symmetric = {
      sourceEntityId: 'entity-a',
      targetEntityId: 'entity-b',
      forwardLabel: 'ally of',
      reverseLabel: 'ally of',
    }
    expect(getRelationLabel(symmetric, 'entity-a')).toBe('ally of')
    expect(getRelationLabel(symmetric, 'entity-b')).toBe('ally of')
  })
})

describe('validateRelationType', () => {
  it('accepts valid built-in types', () => {
    expect(validateRelationType('ally')).toBe(true)
    expect(validateRelationType('enemy')).toBe(true)
    expect(validateRelationType('family:parent')).toBe(true)
    expect(validateRelationType('member_of')).toBe(true)
    expect(validateRelationType('custom')).toBe(true)
  })

  it('rejects unknown types', () => {
    expect(validateRelationType('nonexistent')).toBe(false)
    expect(validateRelationType('')).toBe(false)
  })

  it('has built-in types including family slugs', () => {
    // 17 original + 3 family types (parent_of, spouse_of, sibling_of)
    expect(BUILTIN_RELATION_TYPES).toHaveLength(20)
    expect(BUILTIN_RELATION_TYPES.some((t) => t.slug === 'parent_of')).toBe(true)
    expect(BUILTIN_RELATION_TYPES.some((t) => t.slug === 'spouse_of')).toBe(true)
    expect(BUILTIN_RELATION_TYPES.some((t) => t.slug === 'sibling_of')).toBe(true)
  })
})

describe('computeAttitudeColor', () => {
  it('-100 returns red', () => {
    const color = computeAttitudeColor(-100)
    expect(color).toMatch(/#[a-f0-9]{6}/i)
    // Should be reddish
    expect(color.toLowerCase()).toContain('e') // hex red component
  })

  it('0 returns gray', () => {
    const color = computeAttitudeColor(0)
    expect(color).toBe('#9ca3af')
  })

  it('+100 returns green', () => {
    const color = computeAttitudeColor(100)
    expect(color).toMatch(/#[a-f0-9]{6}/i)
  })

  it('null returns gray', () => {
    expect(computeAttitudeColor(null)).toBe('#9ca3af')
  })

  it('undefined returns gray', () => {
    expect(computeAttitudeColor(undefined)).toBe('#9ca3af')
  })

  it('clamps out-of-range values', () => {
    expect(computeAttitudeColor(-200)).toBe(computeAttitudeColor(-100))
    expect(computeAttitudeColor(200)).toBe(computeAttitudeColor(100))
  })
})

describe('Relation Type Seeding', () => {
  let testDb: TestDb

  beforeEach(() => {
    testDb = createTestDb()
    const now = Date.now()
    testDb.sqlite.exec(`
      INSERT INTO user (id, name, email, email_verified, created_at, updated_at)
      VALUES ('user-1', 'DM', 'dm@test.com', 0, ${now}, ${now})
    `)
    testDb.sqlite.exec(`
      INSERT INTO campaigns (id, name, slug, content_dir, created_by, created_at, updated_at)
      VALUES ('camp-1', 'Test', 'test', '/content', 'user-1', ${now}, ${now})
    `)
  })

  afterEach(() => {
    testDb.close()
  })

  it('seeds built-in relation types including family types', async () => {
    const { seedRelationTypes } = await import('../../../server/services/relationships')
    seedRelationTypes(testDb.db, 'camp-1')

    const types = testDb.sqlite
      .prepare("SELECT * FROM relation_types WHERE campaign_id = 'camp-1'")
      .all() as Record<string, unknown>[]
    // 17 original + 3 family types (parent_of, spouse_of, sibling_of)
    expect(types).toHaveLength(20)
    expect(types.every((t: Record<string, unknown>) => t.is_builtin === 1)).toBe(true)
  })

  it('each type has forward and reverse labels', async () => {
    const { seedRelationTypes } = await import('../../../server/services/relationships')
    seedRelationTypes(testDb.db, 'camp-1')

    const types = testDb.sqlite
      .prepare("SELECT * FROM relation_types WHERE campaign_id = 'camp-1'")
      .all() as Record<string, unknown>[]
    expect(types.every((t: Record<string, unknown>) => t.forward_label && t.reverse_label)).toBe(
      true,
    )
  })
})
