import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createTestDb, type TestDb } from '../../helpers/db'
import { characters } from '../../../server/db/schema/characters'
import { entities } from '../../../server/db/schema/entities'
import { campaigns } from '../../../server/db/schema/campaigns'
import { user } from '../../../server/db/schema/auth'
import { eq } from 'drizzle-orm'
import { randomUUID } from 'crypto'

function seedUser(db: ReturnType<typeof createTestDb>['db'], now: Date) {
  const userId = randomUUID()
  db.insert(user)
    .values({
      id: userId,
      name: 'dm',
      email: `dm${userId}@test.com`,
      emailVerified: false,
      createdAt: now,
      updatedAt: now,
    })
    .run()
  return userId
}

function seedCampaign(db: ReturnType<typeof createTestDb>['db'], userId: string, now: Date) {
  const campaignId = randomUUID()
  db.insert(campaigns)
    .values({
      id: campaignId,
      name: 'Test',
      slug: `test-${campaignId}`,
      contentDir: `/c/${campaignId}`,
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    })
    .run()
  return campaignId
}

function seedEntity(
  db: ReturnType<typeof createTestDb>['db'],
  campaignId: string,
  userId: string,
  now: Date,
) {
  const entityId = randomUUID()
  db.insert(entities)
    .values({
      id: entityId,
      campaignId,
      type: 'character',
      name: 'Agnus',
      slug: `agnus-${entityId}`,
      filePath: `/c/agnus.md`,
      visibility: 'members',
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    })
    .run()
  return entityId
}

describe('characters schema — demographic columns', () => {
  let testDb: TestDb

  beforeEach(() => {
    testDb = createTestDb()
  })

  afterEach(() => {
    testDb.close()
  })

  it('birth_year, death_year, gender columns exist and are nullable', () => {
    const cols = testDb.sqlite.prepare("PRAGMA table_info('characters')").all() as {
      name: string
      notnull: number
      type: string
    }[]
    const birthYear = cols.find((c) => c.name === 'birth_year')
    const deathYear = cols.find((c) => c.name === 'death_year')
    const gender = cols.find((c) => c.name === 'gender')

    expect(birthYear).toBeDefined()
    expect(birthYear!.notnull).toBe(0)

    expect(deathYear).toBeDefined()
    expect(deathYear!.notnull).toBe(0)

    expect(gender).toBeDefined()
    expect(gender!.notnull).toBe(0)
  })

  it('inserts a character with all three demographic fields and round-trips correctly', () => {
    const now = new Date()
    const { db } = testDb
    const userId = seedUser(db, now)
    const campaignId = seedCampaign(db, userId, now)
    const entityId = seedEntity(db, campaignId, userId, now)

    const characterId = randomUUID()
    db.insert(characters)
      .values({
        id: characterId,
        entityId,
        characterType: 'pc',
        status: 'alive',
        birthYear: 1032,
        deathYear: 1095,
        gender: 'female',
      })
      .run()

    const result = db.select().from(characters).where(eq(characters.id, characterId)).get()
    expect(result).toBeDefined()
    expect(result!.birthYear).toBe(1032)
    expect(result!.deathYear).toBe(1095)
    expect(result!.gender).toBe('female')
  })

  it('allows null demographic fields', () => {
    const now = new Date()
    const { db } = testDb
    const userId = seedUser(db, now)
    const campaignId = seedCampaign(db, userId, now)
    const entityId = seedEntity(db, campaignId, userId, now)

    const characterId = randomUUID()
    db.insert(characters)
      .values({ id: characterId, entityId, characterType: 'npc', status: 'alive' })
      .run()

    const result = db.select().from(characters).where(eq(characters.id, characterId)).get()
    expect(result!.birthYear).toBeNull()
    expect(result!.deathYear).toBeNull()
    expect(result!.gender).toBeNull()
  })
})
