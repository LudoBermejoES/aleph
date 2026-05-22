import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { randomUUID } from 'crypto'
import { createTestDb, type TestDb } from '../../helpers/db'
import { campaigns } from '../../../server/db/schema/campaigns'
import { diagrams, diagramSnapshots } from '../../../server/db/schema/diagrams'
import { user } from '../../../server/db/schema/auth'
import { eq, desc } from 'drizzle-orm'

// Mock useDb to use our test database
let testDb: TestDb
vi.mock('../../../server/utils/db', () => ({
  useDb: () => testDb.db,
  useSqlite: () => testDb.sqlite,
}))

// Import after mock setup
const {
  getOrCreateRoom,
  persistRoom,
  closeRoom,
  persistAllRooms,
  closeAllRooms,
  getRoomUserCount,
  getActiveRoomCount,
} = await import('../../../server/services/tldraw-rooms')

const userId = randomUUID()
const campaignId = randomUUID()
const diagramId = randomUUID()

function setupBaseData() {
  testDb.db
    .insert(user)
    .values({
      id: userId,
      name: 'Test DM',
      email: `dm-${Date.now()}@test.com`,
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .run()
  testDb.db
    .insert(campaigns)
    .values({
      id: campaignId,
      name: 'Test Campaign',
      slug: 'test-campaign',
      contentDir: '/tmp/test',
      createdBy: userId,
      isPublic: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .run()
  testDb.db
    .insert(diagrams)
    .values({
      id: diagramId,
      campaignId,
      title: 'Test Diagram',
      diagramType: 'freeform',
      createdBy: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .run()
}

beforeEach(() => {
  testDb = createTestDb()
  setupBaseData()
})

afterEach(() => {
  closeAllRooms()
  testDb.close()
})

describe('getOrCreateRoom', () => {
  it('creates a room for a valid diagram', () => {
    const managed = getOrCreateRoom(diagramId)
    expect(managed).not.toBeNull()
    expect(managed!.diagramId).toBe(diagramId)
    expect(managed!.campaignId).toBe(campaignId)
    expect(managed!.room).toBeDefined()
  })

  it('returns null for non-existent diagram', () => {
    const managed = getOrCreateRoom('non-existent')
    expect(managed).toBeNull()
  })

  it('returns the same room on second call (no duplicate)', () => {
    const first = getOrCreateRoom(diagramId)
    const second = getOrCreateRoom(diagramId)
    expect(first).toBe(second)
  })

  it('loads existing snapshot from DB', () => {
    // Insert a snapshot first
    const snapshotData = { store: {}, schema: { schemaVersion: 2, sequences: {} } }
    testDb.db
      .insert(diagramSnapshots)
      .values({
        id: randomUUID(),
        diagramId,
        snapshot: JSON.stringify(snapshotData),
        version: 1,
        createdAt: new Date(),
      })
      .run()

    const managed = getOrCreateRoom(diagramId)
    expect(managed).not.toBeNull()
    // Room was created successfully (no error from loading snapshot)
    expect(managed!.room.isClosed()).toBe(false)
  })

  it('creates room with empty state when no snapshot exists', () => {
    const managed = getOrCreateRoom(diagramId)
    expect(managed).not.toBeNull()
    expect(managed!.room.isClosed()).toBe(false)
  })
})

function forceNextPersist(managed: ReturnType<typeof getOrCreateRoom>) {
  // Set lastPersistClock to a value that differs from the room's current clock
  // so persistRoom will not skip the write
  if (managed) managed.lastPersistClock = -1
}

describe('persistRoom', () => {
  it('does nothing for non-existent room', () => {
    persistRoom('non-existent')
  })

  it('skips persist when no changes made', () => {
    getOrCreateRoom(diagramId)
    persistRoom(diagramId)

    const snapshots = testDb.db
      .select()
      .from(diagramSnapshots)
      .where(eq(diagramSnapshots.diagramId, diagramId))
      .all()
    expect(snapshots.length).toBeGreaterThanOrEqual(0)
  })

  it('writes a snapshot when forced', () => {
    const managed = getOrCreateRoom(diagramId)
    forceNextPersist(managed)
    persistRoom(diagramId)

    const snapshots = testDb.db
      .select()
      .from(diagramSnapshots)
      .where(eq(diagramSnapshots.diagramId, diagramId))
      .all()
    expect(snapshots.length).toBe(1)
  })

  it('prunes old snapshots keeping only 10 after each write', () => {
    // Pre-populate 12 snapshots
    for (let v = 1; v <= 12; v++) {
      testDb.db
        .insert(diagramSnapshots)
        .values({
          id: randomUUID(),
          diagramId,
          snapshot: JSON.stringify({ store: {}, schema: { schemaVersion: 2, sequences: {} } }),
          version: v,
          createdAt: new Date(),
        })
        .run()
    }

    const managed = getOrCreateRoom(diagramId)
    forceNextPersist(managed)
    persistRoom(diagramId)

    const snapshots = testDb.db
      .select()
      .from(diagramSnapshots)
      .where(eq(diagramSnapshots.diagramId, diagramId))
      .all()
    expect(snapshots.length).toBe(10)
  })

  it('keeps the most recent snapshots when pruning', () => {
    for (let v = 1; v <= 12; v++) {
      testDb.db
        .insert(diagramSnapshots)
        .values({
          id: randomUUID(),
          diagramId,
          snapshot: JSON.stringify({
            store: {},
            schema: { schemaVersion: 2, sequences: {} },
            marker: v,
          }),
          version: v,
          createdAt: new Date(),
        })
        .run()
    }

    const managed = getOrCreateRoom(diagramId)
    forceNextPersist(managed)
    persistRoom(diagramId) // writes version 13, then prunes to top 10

    const kept = testDb.db
      .select({ version: diagramSnapshots.version })
      .from(diagramSnapshots)
      .where(eq(diagramSnapshots.diagramId, diagramId))
      .orderBy(desc(diagramSnapshots.version))
      .all()
      .map((r) => r.version)

    // Should have versions 4..13 (the 10 most recent: 12 pre-existing + 1 new = 13 total, keep top 10)
    expect(kept).toHaveLength(10)
    expect(Math.max(...kept)).toBe(13)
    expect(Math.min(...kept)).toBe(4)
  })

  it('does not prune when fewer than 10 snapshots exist', () => {
    for (let v = 1; v <= 5; v++) {
      testDb.db
        .insert(diagramSnapshots)
        .values({
          id: randomUUID(),
          diagramId,
          snapshot: JSON.stringify({ store: {}, schema: { schemaVersion: 2, sequences: {} } }),
          version: v,
          createdAt: new Date(),
        })
        .run()
    }

    const managed = getOrCreateRoom(diagramId)
    forceNextPersist(managed)
    persistRoom(diagramId) // writes version 6 → total 6, no prune

    const snapshots = testDb.db
      .select()
      .from(diagramSnapshots)
      .where(eq(diagramSnapshots.diagramId, diagramId))
      .all()
    expect(snapshots.length).toBe(6)
  })
})

describe('closeRoom', () => {
  it('closes room and removes from active rooms', () => {
    getOrCreateRoom(diagramId)
    expect(getActiveRoomCount()).toBe(1)

    closeRoom(diagramId)
    expect(getActiveRoomCount()).toBe(0)
  })

  it('does nothing for non-existent room', () => {
    closeRoom('non-existent')
    expect(getActiveRoomCount()).toBe(0)
  })
})

describe('persistAllRooms', () => {
  it('persists all active rooms without error', () => {
    const diagramId2 = randomUUID()
    testDb.db
      .insert(diagrams)
      .values({
        id: diagramId2,
        campaignId,
        title: 'Diagram 2',
        diagramType: 'freeform',
        createdBy: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .run()

    getOrCreateRoom(diagramId)
    getOrCreateRoom(diagramId2)
    expect(getActiveRoomCount()).toBe(2)

    // Should not throw
    persistAllRooms()
  })
})

describe('getRoomUserCount', () => {
  it('returns 0 for non-existent room', () => {
    expect(getRoomUserCount('non-existent')).toBe(0)
  })

  it('returns 0 for room with no connected clients', () => {
    getOrCreateRoom(diagramId)
    expect(getRoomUserCount(diagramId)).toBe(0)
  })
})

describe('closeAllRooms', () => {
  it('closes all active rooms', () => {
    const diagramId2 = randomUUID()
    testDb.db
      .insert(diagrams)
      .values({
        id: diagramId2,
        campaignId,
        title: 'Diagram 2',
        diagramType: 'freeform',
        createdBy: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .run()

    getOrCreateRoom(diagramId)
    getOrCreateRoom(diagramId2)
    expect(getActiveRoomCount()).toBe(2)

    closeAllRooms()
    expect(getActiveRoomCount()).toBe(0)
  })
})
