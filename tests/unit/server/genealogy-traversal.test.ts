import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { buildTree } from '../../../server/services/genealogy'
import { createTestDb, type TestDb } from '../../helpers/db'
import { entityRelations, relationTypes } from '../../../server/db/schema/relations'
import { entities } from '../../../server/db/schema/entities'
import { characters } from '../../../server/db/schema/characters'
import { campaigns } from '../../../server/db/schema/campaigns'
import { user } from '../../../server/db/schema/auth'
import { randomUUID } from 'crypto'

describe('buildTree traversal', () => {
  let testDb: TestDb
  let campaignId: string
  let parentOfTypeId: string
  let spouseOfTypeId: string
  let siblingOfTypeId: string
  let userId: string

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
        slug: name.toLowerCase().replace(/\s/g, '-') + '-' + entityId.slice(0, 4),
        filePath: `/c/${name}.md`,
        visibility: 'members',
        createdBy: userId,
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
        createdBy: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .run()
  }

  function addSpouseOf(a: string, b: string) {
    testDb.db
      .insert(entityRelations)
      .values({
        id: randomUUID(),
        campaignId,
        sourceEntityId: a,
        targetEntityId: b,
        relationTypeId: spouseOfTypeId,
        forwardLabel: 'spouse of',
        reverseLabel: 'spouse of',
        createdBy: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .run()
  }

  beforeEach(() => {
    testDb = createTestDb()
    campaignId = randomUUID()
    userId = randomUUID()
    const now = new Date()
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
    testDb.db
      .insert(campaigns)
      .values({
        id: campaignId,
        name: 'C',
        slug: `c-${campaignId}`,
        contentDir: `/c`,
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
      })
      .run()
    parentOfTypeId = randomUUID()
    spouseOfTypeId = randomUUID()
    siblingOfTypeId = randomUUID()
    testDb.db
      .insert(relationTypes)
      .values([
        {
          id: parentOfTypeId,
          campaignId,
          slug: 'parent_of',
          forwardLabel: 'parent of',
          reverseLabel: 'child of',
          isBuiltin: true,
        },
        {
          id: spouseOfTypeId,
          campaignId,
          slug: 'spouse_of',
          forwardLabel: 'spouse of',
          reverseLabel: 'spouse of',
          isBuiltin: true,
        },
        {
          id: siblingOfTypeId,
          campaignId,
          slug: 'sibling_of',
          forwardLabel: 'sibling of',
          reverseLabel: 'sibling of',
          isBuiltin: true,
        },
      ])
      .run()
  })

  afterEach(() => {
    testDb.close()
  })

  it('returns only focus node for lone character', () => {
    const focus = addEntity('Lone')
    const { rawNodes, edges } = buildTree(focus, campaignId, 3, testDb.db)
    expect(rawNodes.size).toBe(1)
    expect(rawNodes.has(focus)).toBe(true)
    expect(edges).toHaveLength(0)
  })

  it('traverses up to parents and down to children', () => {
    const parent = addEntity('Parent')
    const focus = addEntity('Focus')
    const child = addEntity('Child')
    addParentOf(parent, focus)
    addParentOf(focus, child)

    const { rawNodes, edges } = buildTree(focus, campaignId, 3, testDb.db)
    expect(rawNodes.has(parent)).toBe(true)
    expect(rawNodes.has(focus)).toBe(true)
    expect(rawNodes.has(child)).toBe(true)
    expect(edges).toHaveLength(2)
  })

  it('assigns correct generations: parent=-1, focus=0, child=1', () => {
    const parent = addEntity('P')
    const focus = addEntity('F')
    const child = addEntity('C')
    addParentOf(parent, focus)
    addParentOf(focus, child)

    const { rawNodes } = buildTree(focus, campaignId, 3, testDb.db)
    expect(rawNodes.get(parent)!.generation).toBe(-1)
    expect(rawNodes.get(focus)!.generation).toBe(0)
    expect(rawNodes.get(child)!.generation).toBe(1)
  })

  it('includes spouses at same generation', () => {
    const focus = addEntity('Focus')
    const spouse = addEntity('Spouse')
    addSpouseOf(focus, spouse)

    const { rawNodes } = buildTree(focus, campaignId, 3, testDb.db)
    expect(rawNodes.has(spouse)).toBe(true)
    expect(rawNodes.get(spouse)!.generation).toBe(0)
  })

  it('stops at depth cap', () => {
    // grandparent → parent → focus → child → grandchild
    const gp = addEntity('GP')
    const parent = addEntity('Par')
    const focus = addEntity('Foc')
    const child = addEntity('Chi')
    const gc = addEntity('GC')
    addParentOf(gp, parent)
    addParentOf(parent, focus)
    addParentOf(focus, child)
    addParentOf(child, gc)

    const { rawNodes } = buildTree(focus, campaignId, 1, testDb.db)
    // depth 1: only direct relations (parent and child), not grandparents/grandchildren
    expect(rawNodes.has(gp)).toBe(false)
    expect(rawNodes.has(gc)).toBe(false)
    expect(rawNodes.has(parent)).toBe(true)
    expect(rawNodes.has(child)).toBe(true)
  })

  it('hard cap at depth 10 — does not traverse beyond', () => {
    // Build a chain of 15 generations
    let current = addEntity('gen0')
    const focus = current
    for (let i = 1; i <= 14; i++) {
      const next = addEntity(`gen${i}`)
      addParentOf(current, next)
      current = next
    }
    const { rawNodes } = buildTree(focus, campaignId, 100, testDb.db)
    // Should not include all 15 — capped at 10
    expect(rawNodes.size).toBeLessThanOrEqual(11) // focus + up to 10 generations
  })
})
