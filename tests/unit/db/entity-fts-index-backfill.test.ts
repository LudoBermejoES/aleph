import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { randomUUID } from 'crypto'
import { createTestDb, type TestDb } from '../../helpers/db'
import { campaigns } from '../../../server/db/schema/campaigns'
import { entities } from '../../../server/db/schema/entities'
import { organizations } from '../../../server/db/schema/organizations'
import { arcs, subCampaigns } from '../../../server/db/schema/sessions'
import { user } from '../../../server/db/schema/auth'
import { initFTS5, indexEntity, searchEntities } from '../../../server/services/search'
import { backfillEntityFtsIndex } from '../../../server/db/backfills/entity-fts-index'

type Db = TestDb['db']

describe('backfillEntityFtsIndex', () => {
  let testDb: TestDb
  let db: Db
  let campaignId: string
  let userId: string

  beforeEach(() => {
    testDb = createTestDb()
    db = testDb.db
    initFTS5(testDb.sqlite)
    const now = new Date()

    userId = randomUUID()
    db.insert(user)
      .values({
        id: userId,
        name: 'DM',
        email: `dm-${userId}@test.com`,
        emailVerified: false,
        createdAt: now,
        updatedAt: now,
      })
      .run()

    campaignId = randomUUID()
    db.insert(campaigns)
      .values({
        id: campaignId,
        name: 'C',
        slug: `c-${campaignId}`,
        contentDir: 'var/test-tmp',
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
      })
      .run()
  })

  afterEach(() => {
    testDb.close()
  })

  function seedEntity(type: string, name: string, slug: string, filePath = '') {
    const id = randomUUID()
    const now = new Date()
    db.insert(entities)
      .values({
        id,
        campaignId,
        type,
        name,
        slug,
        filePath,
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
      })
      .run()
    return id
  }

  it('indexes an organization mirror entity using its description column as the body', async () => {
    const id = seedEntity('organization', 'The Silent Order', 'the-silent-order')
    db.insert(organizations)
      .values({
        id,
        campaignId,
        entityId: id,
        name: 'The Silent Order',
        slug: 'the-silent-order',
        description: 'A secretive cabal that meets beneath the old cathedral.',
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .run()

    const result = await backfillEntityFtsIndex(db, testDb.sqlite)

    expect(result.migrated).toBe(1)
    expect(searchEntities(testDb.sqlite, campaignId, 'cathedral')).toHaveLength(1)
    expect(searchEntities(testDb.sqlite, campaignId, 'Silent Order')).toHaveLength(1)
  })

  it('indexes an arc mirror entity using its description column as the body', async () => {
    const subCampaignId = randomUUID()
    db.insert(subCampaigns)
      .values({
        id: subCampaignId,
        campaignId,
        name: 'General',
        slug: 'general',
        isDefault: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .run()

    const id = seedEntity('arc', 'The Hollow Crown', 'the-hollow-crown')
    db.insert(arcs)
      .values({
        id,
        campaignId,
        subCampaignId,
        name: 'The Hollow Crown',
        slug: 'the-hollow-crown',
        description: 'A quest to reclaim a throne lost to shadow magic.',
      })
      .run()

    const result = await backfillEntityFtsIndex(db, testDb.sqlite)

    expect(result.migrated).toBe(1)
    expect(searchEntities(testDb.sqlite, campaignId, 'shadow magic')).toHaveLength(1)
  })

  it('is idempotent — a second run migrates nothing for the same entity', async () => {
    const id = seedEntity('organization', 'The Silent Order', 'the-silent-order')
    db.insert(organizations)
      .values({
        id,
        campaignId,
        entityId: id,
        name: 'The Silent Order',
        slug: 'the-silent-order',
        description: 'A secretive cabal.',
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .run()

    const first = await backfillEntityFtsIndex(db, testDb.sqlite)
    expect(first.migrated).toBe(1)

    const second = await backfillEntityFtsIndex(db, testDb.sqlite)
    expect(second.migrated).toBe(0)
    expect(second.skippedExisting).toBe(1)
  })

  it('does not re-index an entity already indexed via the normal write path', async () => {
    const id = seedEntity('character', 'Strahd von Zarovich', 'strahd')
    indexEntity(testDb.sqlite, id, campaignId, 'Strahd von Zarovich', [], [], 'A vampire lord.')

    const result = await backfillEntityFtsIndex(db, testDb.sqlite)

    expect(result.migrated).toBe(0)
    expect(result.skippedExisting).toBe(1)
    expect(searchEntities(testDb.sqlite, campaignId, 'Strahd')).toHaveLength(1)
  })
})
