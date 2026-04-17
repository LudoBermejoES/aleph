import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { detectCycle, validateYearCoherence } from '../../../server/services/genealogy'
import { createTestDb, type TestDb } from '../../helpers/db'
import { entityRelations, relationTypes } from '../../../server/db/schema/relations'
import { entities } from '../../../server/db/schema/entities'
import { characters } from '../../../server/db/schema/characters'
import { campaigns } from '../../../server/db/schema/campaigns'
import { user } from '../../../server/db/schema/auth'
import { randomUUID } from 'crypto'

describe('validateYearCoherence', () => {
  it('returns empty array when no anomaly', () => {
    expect(
      validateYearCoherence({ birthYear: 1000, deathYear: 1060 }, { birthYear: 1030 }),
    ).toEqual([])
  })

  it('warns when parent birthYear >= child birthYear', () => {
    const warnings = validateYearCoherence(
      { birthYear: 1030, deathYear: null },
      { birthYear: 1020 },
    )
    expect(warnings).toHaveLength(1)
    expect(warnings[0].type).toBe('parent_younger_than_child')
  })

  it('warns when parent deathYear < child birthYear', () => {
    const warnings = validateYearCoherence({ birthYear: 900, deathYear: 950 }, { birthYear: 1000 })
    expect(warnings).toHaveLength(1)
    expect(warnings[0].type).toBe('parent_died_before_child_birth')
  })

  it('returns multiple warnings when both conditions hold', () => {
    const warnings = validateYearCoherence(
      { birthYear: 1050, deathYear: 1020 },
      { birthYear: 1040 },
    )
    expect(warnings.length).toBeGreaterThanOrEqual(1)
  })

  it('returns empty when years are null', () => {
    expect(
      validateYearCoherence({ birthYear: null, deathYear: null }, { birthYear: null }),
    ).toEqual([])
  })

  it('no warning when parent deathYear >= child birthYear', () => {
    const warnings = validateYearCoherence(
      { birthYear: 1000, deathYear: 1060 },
      { birthYear: 1060 },
    )
    expect(warnings.filter((w) => w.type === 'parent_died_before_child_birth')).toHaveLength(0)
  })
})

describe('detectCycle', () => {
  let testDb: TestDb
  let campaignId: string
  let parentOfTypeId: string

  function addEntity(name: string) {
    const entityId = randomUUID()
    const characterId = randomUUID()
    testDb.db
      .insert(entities)
      .values({
        id: entityId,
        campaignId,
        type: 'character',
        name,
        slug: name.toLowerCase(),
        filePath: `/c/${name}.md`,
        visibility: 'members',
        createdBy: 'u1',
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .run()
    testDb.db
      .insert(characters)
      .values({ id: characterId, entityId, characterType: 'npc', status: 'alive' })
      .run()
    return entityId
  }

  function addParentOf(parentId: string, childId: string) {
    testDb.db
      .insert(entityRelations)
      .values({
        id: randomUUID(),
        campaignId,
        sourceEntityId: parentId,
        targetEntityId: childId,
        relationTypeId: parentOfTypeId,
        forwardLabel: 'parent of',
        reverseLabel: 'child of',
        createdBy: 'u1',
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .run()
  }

  beforeEach(() => {
    testDb = createTestDb()
    campaignId = randomUUID()
    const now = new Date()
    const userId = randomUUID()
    testDb.db
      .insert(user)
      .values({
        id: userId,
        name: 'DM',
        email: `dm${userId}@t.com`,
        emailVerified: false,
        createdAt: now,
        updatedAt: now,
      })
      .run()
    // Insert user with id 'u1' for relations
    testDb.db
      .insert(user)
      .values({
        id: 'u1',
        name: 'U1',
        email: 'u1@t.com',
        emailVerified: false,
        createdAt: now,
        updatedAt: now,
      })
      .run()
    testDb.db
      .insert(campaigns)
      .values({
        id: campaignId,
        name: 'C',
        slug: `c-${campaignId}`,
        contentDir: `/c/${campaignId}`,
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
      })
      .run()
    parentOfTypeId = randomUUID()
    testDb.db
      .insert(relationTypes)
      .values({
        id: parentOfTypeId,
        campaignId,
        slug: 'parent_of',
        forwardLabel: 'parent of',
        reverseLabel: 'child of',
        isBuiltin: true,
      })
      .run()
  })

  afterEach(() => {
    testDb.close()
  })

  it('returns false when no cycle (direct parent)', async () => {
    const parent = addEntity('parent')
    const child = addEntity('child')
    addParentOf(parent, child)
    expect(await detectCycle(parent, child, testDb.db, campaignId)).toBe(false)
  })

  it('detects self-cycle (entity as own parent)', async () => {
    const entityId = addEntity('self')
    expect(await detectCycle(entityId, entityId, testDb.db, campaignId)).toBe(true)
  })

  it('detects direct cycle: A→B and trying B→A', async () => {
    const a = addEntity('a')
    const b = addEntity('b')
    addParentOf(a, b) // A is parent of B
    // Now trying to make B parent of A: detectCycle(B, A) — traverse up from B, find A
    expect(await detectCycle(b, a, testDb.db, campaignId)).toBe(true)
  })

  it('detects transitive cycle: A→B→C, trying C→A', async () => {
    const a = addEntity('ta')
    const b = addEntity('tb')
    const c = addEntity('tc')
    addParentOf(a, b)
    addParentOf(b, c)
    // Trying C → A: detectCycle(C, A) — traverse up from C, find A
    expect(await detectCycle(c, a, testDb.db, campaignId)).toBe(true)
  })

  it('returns false for unrelated entities', async () => {
    const a = addEntity('ua')
    const b = addEntity('ub')
    expect(await detectCycle(a, b, testDb.db, campaignId)).toBe(false)
  })
})
