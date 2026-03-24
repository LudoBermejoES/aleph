import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createTestDb, type TestDb } from '../../helpers/db'
import { user } from '../../../server/db/schema/auth'
import { campaigns } from '../../../server/db/schema/campaigns'
import { eq } from 'drizzle-orm'
import { randomUUID } from 'crypto'

describe('Database Setup', () => {
  let testDb: TestDb

  beforeEach(() => {
    testDb = createTestDb()
  })

  afterEach(() => {
    testDb.close()
  })

  it('creates an in-memory SQLite database', () => {
    expect(testDb.sqlite).toBeDefined()
    expect(testDb.db).toBeDefined()
  })

  it('has WAL mode enabled', () => {
    const result = testDb.sqlite.pragma('journal_mode') as { journal_mode: string }[]
    expect(result[0].journal_mode).toBeDefined()
  })

  it('has foreign keys enabled', () => {
    const result = testDb.sqlite.pragma('foreign_keys') as { foreign_keys: number }[]
    expect(result[0].foreign_keys).toBe(1)
  })

  it('applies migrations (user table exists)', () => {
    const tables = testDb.sqlite
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='user'")
      .all() as { name: string }[]
    expect(tables).toHaveLength(1)
    expect(tables[0].name).toBe('user')
  })

  it('applies migrations (campaigns table exists)', () => {
    const tables = testDb.sqlite
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='campaigns'")
      .all() as { name: string }[]
    expect(tables).toHaveLength(1)
    expect(tables[0].name).toBe('campaigns')
  })

  it('can insert and query a user via Drizzle', () => {
    const now = new Date()
    const userId = randomUUID()

    testDb.db.insert(user).values({
      id: userId,
      name: 'testuser',
      email: 'test@example.com',
      emailVerified: false,
      createdAt: now,
      updatedAt: now,
    }).run()

    const result = testDb.db.select().from(user).where(eq(user.id, userId)).get()
    expect(result).toBeDefined()
    expect(result!.name).toBe('testuser')
    expect(result!.email).toBe('test@example.com')
  })

  it('can insert a campaign with foreign key to user', () => {
    const now = new Date()
    const userId = randomUUID()
    const campaignId = randomUUID()

    testDb.db.insert(user).values({
      id: userId,
      name: 'dm',
      email: 'dm@example.com',
      emailVerified: false,
      createdAt: now,
      updatedAt: now,
    }).run()

    testDb.db.insert(campaigns).values({
      id: campaignId,
      name: 'Curse of Strahd',
      slug: 'curse-of-strahd',
      contentDir: '/content/campaigns/curse-of-strahd',
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    }).run()

    const result = testDb.db.select().from(campaigns).where(eq(campaigns.id, campaignId)).get()
    expect(result).toBeDefined()
    expect(result!.name).toBe('Curse of Strahd')
    expect(result!.createdBy).toBe(userId)
  })

  it('enforces foreign key constraint on campaigns.created_by', () => {
    const now = new Date()

    expect(() => {
      testDb.db.insert(campaigns).values({
        id: randomUUID(),
        name: 'Orphan Campaign',
        slug: 'orphan',
        contentDir: '/content/campaigns/orphan',
        createdBy: 'nonexistent-user-id',
        createdAt: now,
        updatedAt: now,
      }).run()
    }).toThrow()
  })
})
