import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { randomUUID } from 'crypto'
import { eq } from 'drizzle-orm'
import { createTestDb, type TestDb } from '../../helpers/db'
import { campaigns } from '../../../server/db/schema/campaigns'
import { entities } from '../../../server/db/schema/entities'
import { subCampaigns, arcs } from '../../../server/db/schema/sessions'
import { user } from '../../../server/db/schema/auth'
import { backfillArcEntities } from '../../../server/db/backfills/arc-entities'

type Db = TestDb['db']

describe('backfillArcEntities', () => {
  let testDb: TestDb
  let db: Db
  let campaignId: string
  let subCampaignId: string
  let userId: string

  beforeEach(() => {
    testDb = createTestDb()
    db = testDb.db
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

    subCampaignId = randomUUID()
    db.insert(subCampaigns)
      .values({
        id: subCampaignId,
        campaignId,
        name: 'General',
        slug: 'general',
        isDefault: true,
        createdAt: now,
        updatedAt: now,
      })
      .run()
  })

  afterEach(() => {
    testDb.close()
  })

  function seedArc(overrides: Partial<typeof arcs.$inferInsert> = {}) {
    const id = randomUUID()
    db.insert(arcs)
      .values({
        id,
        campaignId,
        subCampaignId,
        name: overrides.name ?? 'An Arc',
        slug: overrides.slug ?? 'an-arc',
        status: 'planned',
        ...overrides,
      })
      .run()
    return id
  }

  it('creates a mirror entity reusing the arc id, name, and slug, with no backing file', async () => {
    const id = seedArc({ name: 'El camino hasta Oda', slug: 'el-camino-hasta-oda' })

    const result = await backfillArcEntities(db)

    expect(result.migrated).toBe(1)
    expect(result.skippedExisting).toBe(0)

    const entity = db.select().from(entities).where(eq(entities.id, id)).get()
    expect(entity).toBeDefined()
    expect(entity!.type).toBe('arc')
    expect(entity!.name).toBe('El camino hasta Oda')
    expect(entity!.slug).toBe('el-camino-hasta-oda')
    expect(entity!.filePath).toBe('')
    expect(entity!.visibility).toBe('members')
    expect(entity!.campaignId).toBe(campaignId)
    expect(entity!.createdBy).toBe(userId)
  })

  it('de-duplicates the mirror entity slug on collision, leaving the arc slug untouched', async () => {
    const now = new Date()
    db.insert(entities)
      .values({
        id: randomUUID(),
        campaignId,
        type: 'location',
        name: 'Taken',
        slug: 'taken-slug',
        filePath: '',
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
      })
      .run()
    const arcId = seedArc({ name: 'Taken', slug: 'taken-slug' })

    await backfillArcEntities(db)

    const arc = db.select().from(arcs).where(eq(arcs.id, arcId)).get()!
    expect(arc.slug).toBe('taken-slug')

    const entity = db.select().from(entities).where(eq(entities.id, arcId)).get()!
    expect(entity.slug).not.toBe('taken-slug')
    expect(entity.slug.startsWith('taken-slug-')).toBe(true)
  })

  it('is idempotent — a second run migrates nothing and creates no duplicates', async () => {
    seedArc({ name: 'Once', slug: 'once' })

    const first = await backfillArcEntities(db)
    expect(first.migrated).toBe(1)

    const second = await backfillArcEntities(db)
    expect(second.migrated).toBe(0)
    expect(second.skippedExisting).toBe(1)

    expect(db.select().from(entities).where(eq(entities.type, 'arc')).all()).toHaveLength(1)
  })
})
