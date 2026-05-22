import { TLSocketRoom } from '@tldraw/sync-core'
import type { TLStoreSnapshot, TLRecord } from '@tldraw/tlschema'
import { randomUUID } from 'crypto'
import { eq, desc, and, notInArray } from 'drizzle-orm'
import { useDb } from '../utils/db'
import { diagrams, diagramSnapshots } from '../db/schema/diagrams'
import { logger } from '../utils/logger'
import { alephTLSchema } from './tldraw-shape-schemas'

const MAX_SNAPSHOTS_PER_DIAGRAM = 10

interface ManagedRoom {
  room: TLSocketRoom<TLRecord>
  diagramId: string
  campaignId: string
  persistTimer: ReturnType<typeof setTimeout> | null
  maxPersistTimer: ReturnType<typeof setTimeout> | null
  cleanupTimer: ReturnType<typeof setTimeout> | null
  lastPersistClock: number
}

const rooms = new Map<string, ManagedRoom>()

const PERSIST_DEBOUNCE_MS = 2000
const MAX_PERSIST_MS = 10000
const GRACE_PERIOD_MS = 30000

function loadSnapshotFromDb(diagramId: string): TLStoreSnapshot | null {
  const db = useDb()
  const row = db
    .select()
    .from(diagramSnapshots)
    .where(eq(diagramSnapshots.diagramId, diagramId))
    .orderBy(desc(diagramSnapshots.version))
    .limit(1)
    .get()
  if (!row) return null
  const parsed = JSON.parse(row.snapshot) as Record<string, unknown>
  // REST mode saved TLEditorSnapshot ({ document: { store, schema }, session })
  // Sync mode saves TLStoreSnapshot ({ store, schema }) — extract .document if needed
  if (parsed?.document && typeof parsed.document === 'object') {
    return parsed.document as TLStoreSnapshot
  }
  return parsed as TLStoreSnapshot
}

function getCampaignIdForDiagram(diagramId: string): string | null {
  const db = useDb()
  const row = db
    .select({ campaignId: diagrams.campaignId })
    .from(diagrams)
    .where(eq(diagrams.id, diagramId))
    .get()
  return row?.campaignId ?? null
}

function writeSnapshotToDb(diagramId: string, snapshot: TLStoreSnapshot): void {
  const db = useDb()
  const latest = db
    .select({ version: diagramSnapshots.version })
    .from(diagramSnapshots)
    .where(eq(diagramSnapshots.diagramId, diagramId))
    .orderBy(desc(diagramSnapshots.version))
    .limit(1)
    .get()

  const nextVersion = (latest?.version ?? 0) + 1
  const now = new Date()

  db.insert(diagramSnapshots)
    .values({
      id: randomUUID(),
      diagramId,
      snapshot: JSON.stringify(snapshot),
      version: nextVersion,
      createdAt: now,
    })
    .run()

  db.update(diagrams).set({ updatedAt: now }).where(eq(diagrams.id, diagramId)).run()

  // Keep only the most recent MAX_SNAPSHOTS_PER_DIAGRAM snapshots
  const keepIds = db
    .select({ id: diagramSnapshots.id })
    .from(diagramSnapshots)
    .where(eq(diagramSnapshots.diagramId, diagramId))
    .orderBy(desc(diagramSnapshots.version))
    .limit(MAX_SNAPSHOTS_PER_DIAGRAM)
    .all()
    .map((r) => r.id)

  if (keepIds.length === MAX_SNAPSHOTS_PER_DIAGRAM) {
    db.delete(diagramSnapshots)
      .where(
        and(eq(diagramSnapshots.diagramId, diagramId), notInArray(diagramSnapshots.id, keepIds)),
      )
      .run()
  }
}

function schedulePersist(managed: ManagedRoom): void {
  // Debounced persist
  if (managed.persistTimer) clearTimeout(managed.persistTimer)
  managed.persistTimer = setTimeout(() => {
    persistRoom(managed.diagramId)
  }, PERSIST_DEBOUNCE_MS)

  // Max persist — force save every MAX_PERSIST_MS during active editing
  if (!managed.maxPersistTimer) {
    managed.maxPersistTimer = setTimeout(() => {
      managed.maxPersistTimer = null
      persistRoom(managed.diagramId)
    }, MAX_PERSIST_MS)
  }
}

export function getOrCreateRoom(diagramId: string): ManagedRoom | null {
  const existing = rooms.get(diagramId)
  if (existing) {
    // Cancel cleanup if reconnecting within grace period
    if (existing.cleanupTimer) {
      clearTimeout(existing.cleanupTimer)
      existing.cleanupTimer = null
    }
    return existing
  }

  const campaignId = getCampaignIdForDiagram(diagramId)
  if (!campaignId) return null

  const snapshot = loadSnapshotFromDb(diagramId)

  const room = new TLSocketRoom({
    schema: alephTLSchema,
    initialSnapshot: snapshot ?? undefined,
    onSessionRemoved(_room, { numSessionsRemaining, sessionId }) {
      logger.debug('tldraw-rooms: session removed', { diagramId, sessionId, numSessionsRemaining })
      if (numSessionsRemaining === 0) {
        scheduleCleanup(diagramId)
      }
    },
    onDataChange() {
      const managed = rooms.get(diagramId)
      if (managed) schedulePersist(managed)
    },
    log: {
      warn: (...args: unknown[]) => logger.warn('tldraw-rooms:', ...args),
      error: (...args: unknown[]) => logger.error('tldraw-rooms:', ...args),
    },
  })

  const managed: ManagedRoom = {
    room,
    diagramId,
    campaignId,
    persistTimer: null,
    maxPersistTimer: null,
    cleanupTimer: null,
    lastPersistClock: room.getCurrentDocumentClock(),
  }
  rooms.set(diagramId, managed)
  logger.info('tldraw-rooms: room created', { diagramId, campaignId })
  return managed
}

export function persistRoom(diagramId: string): void {
  const managed = rooms.get(diagramId)
  if (!managed || managed.room.isClosed()) return

  const currentClock = managed.room.getCurrentDocumentClock()
  if (currentClock === managed.lastPersistClock) return // no changes

  try {
    const snapshot = managed.room.getCurrentSnapshot()
    writeSnapshotToDb(diagramId, snapshot as TLStoreSnapshot)
    managed.lastPersistClock = currentClock

    // Clear max persist timer since we just saved
    if (managed.maxPersistTimer) {
      clearTimeout(managed.maxPersistTimer)
      managed.maxPersistTimer = null
    }
    if (managed.persistTimer) {
      clearTimeout(managed.persistTimer)
      managed.persistTimer = null
    }
    logger.debug('tldraw-rooms: room persisted', { diagramId })
  } catch (err) {
    logger.error('tldraw-rooms: failed to persist room', { diagramId, error: err })
  }
}

function scheduleCleanup(diagramId: string): void {
  const managed = rooms.get(diagramId)
  if (!managed) return

  managed.cleanupTimer = setTimeout(() => {
    closeRoom(diagramId)
  }, GRACE_PERIOD_MS)
  logger.debug('tldraw-rooms: cleanup scheduled', { diagramId, graceMs: GRACE_PERIOD_MS })
}

export function closeRoom(diagramId: string): void {
  const managed = rooms.get(diagramId)
  if (!managed) return

  // Persist before closing
  persistRoom(diagramId)

  // Clear all timers
  if (managed.persistTimer) clearTimeout(managed.persistTimer)
  if (managed.maxPersistTimer) clearTimeout(managed.maxPersistTimer)
  if (managed.cleanupTimer) clearTimeout(managed.cleanupTimer)

  managed.room.close()
  rooms.delete(diagramId)
  logger.info('tldraw-rooms: room closed', { diagramId })
}

export function persistAllRooms(): void {
  for (const diagramId of rooms.keys()) {
    persistRoom(diagramId)
  }
  logger.info('tldraw-rooms: all rooms persisted', { count: rooms.size })
}

export function closeAllRooms(): void {
  for (const diagramId of [...rooms.keys()]) {
    closeRoom(diagramId)
  }
}

export function getRoomUserCount(diagramId: string): number {
  const managed = rooms.get(diagramId)
  if (!managed) return 0
  return managed.room.getNumActiveSessions()
}

export function getRoomSessions(diagramId: string) {
  const managed = rooms.get(diagramId)
  if (!managed) return []
  return managed.room.getSessions()
}

export function getActiveRoomCount(): number {
  return rooms.size
}

// Persist all rooms on process shutdown
function onShutdown() {
  if (rooms.size > 0) {
    logger.info('tldraw-rooms: shutdown signal, persisting all rooms')
    persistAllRooms()
    closeAllRooms()
  }
}
process.on('SIGTERM', onShutdown)
process.on('SIGINT', onShutdown)
