import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { randomUUID } from 'crypto'
import { eq, and } from 'drizzle-orm'
import { createTestDb, type TestDb } from '../../helpers/db'
import { campaigns } from '../../../server/db/schema/campaigns'
import { entities } from '../../../server/db/schema/entities'
import { subCampaigns, quests } from '../../../server/db/schema/sessions'
import { entityRelations, relationTypes } from '../../../server/db/schema/relations'
import { user } from '../../../server/db/schema/auth'
import { backfillQuestEntities } from '../../../server/db/backfills/quest-entities'

type Db = TestDb['db']

describe('backfillQuestEntities', () => {
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

  function seedQuest(overrides: Partial<typeof quests.$inferInsert> = {}) {
    const id = randomUUID()
    const now = new Date()
    db.insert(quests)
      .values({
        id,
        campaignId,
        subCampaignId,
        name: overrides.name ?? 'A Quest',
        slug: overrides.slug ?? 'a-quest',
        status: 'active',
        isSecret: overrides.isSecret ?? false,
        logFilePath: overrides.logFilePath ?? null,
        createdAt: now,
        updatedAt: now,
        ...overrides,
      })
      .run()
    return id
  }

  it('creates a mirror entity reusing the quest id, name, and slug', async () => {
    const id = seedQuest({ name: 'Find the Smith', slug: 'find-the-smith' })

    const result = await backfillQuestEntities(db)

    expect(result.migrated).toBe(1)
    expect(result.skippedExisting).toBe(0)

    const entity = db.select().from(entities).where(eq(entities.id, id)).get()
    expect(entity).toBeDefined()
    expect(entity!.type).toBe('quest')
    expect(entity!.name).toBe('Find the Smith')
    expect(entity!.slug).toBe('find-the-smith')
    expect(entity!.campaignId).toBe(campaignId)
    expect(entity!.createdBy).toBe(userId) // falls back to the campaign's own createdBy
  })

  it('maps isSecret to dm_only visibility, and false to members', async () => {
    const secretId = seedQuest({ name: 'Secret Quest', slug: 'secret-quest', isSecret: true })
    const openId = seedQuest({ name: 'Open Quest', slug: 'open-quest', isSecret: false })

    await backfillQuestEntities(db)

    expect(db.select().from(entities).where(eq(entities.id, secretId)).get()!.visibility).toBe(
      'dm_only',
    )
    expect(db.select().from(entities).where(eq(entities.id, openId)).get()!.visibility).toBe(
      'members',
    )
  })

  it('de-duplicates the mirror entity slug on collision, leaving quests.slug untouched', async () => {
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
    const questId = seedQuest({ name: 'Taken', slug: 'taken-slug' })

    await backfillQuestEntities(db)

    const quest = db.select().from(quests).where(eq(quests.id, questId)).get()!
    expect(quest.slug).toBe('taken-slug') // untouched — this is a pre-existing public URL

    const entity = db.select().from(entities).where(eq(entities.id, questId)).get()!
    expect(entity.slug).not.toBe('taken-slug')
    expect(entity.slug.startsWith('taken-slug-')).toBe(true)
  })

  it('is idempotent — a second run migrates nothing and creates no duplicates', async () => {
    seedQuest({ name: 'Once', slug: 'once' })

    const first = await backfillQuestEntities(db)
    expect(first.migrated).toBe(1)

    const second = await backfillQuestEntities(db)
    expect(second.migrated).toBe(0)
    expect(second.skippedExisting).toBe(1)

    expect(db.select().from(entities).where(eq(entities.type, 'quest')).all()).toHaveLength(1)
  })

  it('leaves quests that already have a mirror entity untouched', async () => {
    const id = seedQuest({ name: 'Pre-mirrored', slug: 'pre-mirrored' })
    const now = new Date()
    db.insert(entities)
      .values({
        id,
        campaignId,
        type: 'quest',
        name: 'Pre-mirrored',
        slug: 'pre-mirrored',
        filePath: '',
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
      })
      .run()

    const result = await backfillQuestEntities(db)

    expect(result.migrated).toBe(0)
    expect(result.skippedExisting).toBe(1)
  })

  it('a backfilled quest is relatable — its mirror entity can be the target of a relation', async () => {
    const mainId = seedQuest({ name: 'Main Quest', slug: 'main-quest' })
    const subId = seedQuest({ name: 'Sub Quest', slug: 'sub-quest' })

    await backfillQuestEntities(db)

    const now = new Date()
    const relationTypeId = randomUUID()
    db.insert(relationTypes)
      .values({
        id: relationTypeId,
        campaignId,
        slug: 'custom',
        forwardLabel: 'related to',
        reverseLabel: 'related to',
        isBuiltin: true,
      })
      .run()

    const relationId = randomUUID()
    db.insert(entityRelations)
      .values({
        id: relationId,
        campaignId,
        sourceEntityId: subId,
        targetEntityId: mainId,
        relationTypeId,
        forwardLabel: 'es parte de',
        reverseLabel: 'incluye la sub-misión',
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
      })
      .run()

    const stored = db
      .select()
      .from(entityRelations)
      .where(
        and(eq(entityRelations.sourceEntityId, subId), eq(entityRelations.targetEntityId, mainId)),
      )
      .get()
    expect(stored).toBeDefined()
  })
})
