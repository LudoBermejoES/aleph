import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { randomUUID } from 'crypto'
import { createTestDb, type TestDb } from '../../helpers/db'
import { generateApiKey, hashApiKey } from '../../../server/utils/apiKey'
import { apiKey as apiKeyTable, user as userTable } from '../../../server/db/schema/auth'
import { and, eq, isNull } from 'drizzle-orm'

// Helpers to simulate what the endpoint handlers do directly against the DB
async function createUser(db: any, email: string) {
  const id = randomUUID()
  db.insert(userTable).values({
    id,
    name: 'Test User',
    email,
    emailVerified: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  }).run()
  return id
}

async function createApiKeyForUser(db: any, userId: string, name: string) {
  const { raw, hash, prefix } = generateApiKey()
  const id = randomUUID()
  db.insert(apiKeyTable).values({
    id,
    userId,
    name,
    keyHash: hash,
    keyPrefix: prefix,
    createdAt: new Date(),
  }).run()
  return { id, raw, hash, prefix }
}

describe('API key DB operations', () => {
  let testDb: TestDb

  beforeEach(() => {
    testDb = createTestDb()
  })

  afterEach(() => {
    testDb.close()
  })

  describe('create key', () => {
    it('inserts a key row and raw key is not stored', async () => {
      const userId = await createUser(testDb.db, `u1-${Date.now()}@test.com`)
      const { raw, id } = await createApiKeyForUser(testDb.db, userId, 'test-key')

      const row = testDb.db.select().from(apiKeyTable).where(eq(apiKeyTable.id, id)).get()
      expect(row).toBeDefined()
      expect(row!.keyHash).not.toBe(raw) // hash is stored, not raw
      expect(row!.keyHash).toBe(hashApiKey(raw))
      expect(row!.name).toBe('test-key')
      expect(row!.revokedAt).toBeNull()
    })

    it('stores the correct prefix', async () => {
      const userId = await createUser(testDb.db, `u2-${Date.now()}@test.com`)
      const { raw, prefix, id } = await createApiKeyForUser(testDb.db, userId, 'prefix-test')

      const row = testDb.db.select().from(apiKeyTable).where(eq(apiKeyTable.id, id)).get()
      expect(row!.keyPrefix).toBe(prefix)
      expect(row!.keyPrefix).toBe(raw.slice(0, 14))
    })
  })

  describe('list keys', () => {
    it('returns only keys belonging to the requesting user', async () => {
      const userA = await createUser(testDb.db, `ua-${Date.now()}@test.com`)
      const userB = await createUser(testDb.db, `ub-${Date.now()}@test.com`)

      await createApiKeyForUser(testDb.db, userA, 'key-for-a')
      await createApiKeyForUser(testDb.db, userB, 'key-for-b')

      const keysForA = testDb.db.select().from(apiKeyTable).where(eq(apiKeyTable.userId, userA)).all()
      const keysForB = testDb.db.select().from(apiKeyTable).where(eq(apiKeyTable.userId, userB)).all()

      expect(keysForA).toHaveLength(1)
      expect(keysForA[0].name).toBe('key-for-a')
      expect(keysForB).toHaveLength(1)
      expect(keysForB[0].name).toBe('key-for-b')
    })

    it('returns empty array for user with no keys', async () => {
      const userId = await createUser(testDb.db, `empty-${Date.now()}@test.com`)
      const keys = testDb.db.select().from(apiKeyTable).where(eq(apiKeyTable.userId, userId)).all()
      expect(keys).toHaveLength(0)
    })
  })

  describe('revoke key', () => {
    it('sets revokedAt on the key row', async () => {
      const userId = await createUser(testDb.db, `rev-${Date.now()}@test.com`)
      const { id } = await createApiKeyForUser(testDb.db, userId, 'to-revoke')

      testDb.db.update(apiKeyTable).set({ revokedAt: new Date() }).where(eq(apiKeyTable.id, id)).run()

      const row = testDb.db.select().from(apiKeyTable).where(eq(apiKeyTable.id, id)).get()
      expect(row!.revokedAt).not.toBeNull()
    })

    it('revoked key is not found in active key lookup', async () => {
      const userId = await createUser(testDb.db, `rlookup-${Date.now()}@test.com`)
      const { raw, id } = await createApiKeyForUser(testDb.db, userId, 'to-revoke-2')
      const hash = hashApiKey(raw)

      // Revoke it
      testDb.db.update(apiKeyTable).set({ revokedAt: new Date() }).where(eq(apiKeyTable.id, id)).run()

      // Simulate auth middleware lookup: keyHash = ? AND revokedAt IS NULL
      const found = testDb.db
        .select()
        .from(apiKeyTable)
        .where(and(eq(apiKeyTable.keyHash, hash), isNull(apiKeyTable.revokedAt)))
        .get()

      expect(found).toBeUndefined()
    })

    it('returns 404 equivalent when key belongs to different user', async () => {
      const userA = await createUser(testDb.db, `owner-${Date.now()}@test.com`)
      const userB = await createUser(testDb.db, `thief-${Date.now()}@test.com`)
      const { id } = await createApiKeyForUser(testDb.db, userA, 'owned-by-a')

      // Simulate: query with wrong userId should return nothing
      const row = testDb.db
        .select()
        .from(apiKeyTable)
        .where(and(eq(apiKeyTable.id, id), eq(apiKeyTable.userId, userB)))
        .get()

      expect(row).toBeUndefined()
    })
  })

  describe('auth middleware key lookup', () => {
    it('finds valid key by hash when not revoked', async () => {
      const userId = await createUser(testDb.db, `auth-${Date.now()}@test.com`)
      const { raw } = await createApiKeyForUser(testDb.db, userId, 'auth-key')
      const hash = hashApiKey(raw)

      const row = testDb.db
        .select()
        .from(apiKeyTable)
        .where(and(eq(apiKeyTable.keyHash, hash), isNull(apiKeyTable.revokedAt)))
        .get()

      expect(row).toBeDefined()
      expect(row!.userId).toBe(userId)
    })

    it('does not find key with wrong hash', async () => {
      const userId = await createUser(testDb.db, `bk-${Date.now()}@test.com`)
      await createApiKeyForUser(testDb.db, userId, 'real-key')

      const badHash = hashApiKey('aleph_completely_wrong_key_value_here_0000000000000000')
      const row = testDb.db
        .select()
        .from(apiKeyTable)
        .where(and(eq(apiKeyTable.keyHash, badHash), isNull(apiKeyTable.revokedAt)))
        .get()

      expect(row).toBeUndefined()
    })
  })
})
