import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { randomUUID } from 'crypto'
import { eq } from 'drizzle-orm'
import { createTestDb, type TestDb } from '../../helpers/db'
import { campaigns } from '../../../server/db/schema/campaigns'
import { entities } from '../../../server/db/schema/entities'
import { subCampaigns, gameSessions } from '../../../server/db/schema/sessions'
import { user } from '../../../server/db/schema/auth'
import { backfillSessionEntities } from '../../../server/db/backfills/session-entities'

type Db = TestDb['db']

describe('backfillSessionEntities', () => {
  let testDb: TestDb
  let db: Db
  let campaignId: string
  let subCampaignId: string
  let userId: string
  let sessionCounter: number

  beforeEach(() => {
    testDb = createTestDb()
    db = testDb.db
    sessionCounter = 0
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

  function seedSession(overrides: Partial<typeof gameSessions.$inferInsert> = {}) {
    const id = randomUUID()
    const now = new Date()
    sessionCounter += 1
    db.insert(gameSessions)
      .values({
        id,
        campaignId,
        subCampaignId,
        title: overrides.title ?? 'A Session',
        slug: overrides.slug ?? 'a-session',
        sessionNumber: sessionCounter,
        status: 'planned',
        logFilePath: overrides.logFilePath ?? null,
        createdAt: now,
        updatedAt: now,
        ...overrides,
      })
      .run()
    return id
  }

  it('creates a mirror entity reusing the session id, title as name, and slug', async () => {
    const id = seedSession({
      title: 'La noche que se tragó a Clara',
      slug: 'la-noche-que-se-trago-a-clara',
    })

    const result = await backfillSessionEntities(db)

    expect(result.migrated).toBe(1)
    expect(result.skippedExisting).toBe(0)

    const entity = db.select().from(entities).where(eq(entities.id, id)).get()
    expect(entity).toBeDefined()
    expect(entity!.type).toBe('session')
    expect(entity!.name).toBe('La noche que se tragó a Clara')
    expect(entity!.slug).toBe('la-noche-que-se-trago-a-clara')
    expect(entity!.campaignId).toBe(campaignId)
    expect(entity!.visibility).toBe('members')
    expect(entity!.createdBy).toBe(userId)
  })

  it('de-duplicates the mirror entity slug on collision, leaving the session slug untouched', async () => {
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
    const sessionId = seedSession({ title: 'Taken', slug: 'taken-slug' })

    await backfillSessionEntities(db)

    const session = db.select().from(gameSessions).where(eq(gameSessions.id, sessionId)).get()!
    expect(session.slug).toBe('taken-slug')

    const entity = db.select().from(entities).where(eq(entities.id, sessionId)).get()!
    expect(entity.slug).not.toBe('taken-slug')
    expect(entity.slug.startsWith('taken-slug-')).toBe(true)
  })

  it('is idempotent — a second run migrates nothing and creates no duplicates', async () => {
    seedSession({ title: 'Once', slug: 'once' })

    const first = await backfillSessionEntities(db)
    expect(first.migrated).toBe(1)

    const second = await backfillSessionEntities(db)
    expect(second.migrated).toBe(0)
    expect(second.skippedExisting).toBe(1)

    expect(db.select().from(entities).where(eq(entities.type, 'session')).all()).toHaveLength(1)
  })
})
