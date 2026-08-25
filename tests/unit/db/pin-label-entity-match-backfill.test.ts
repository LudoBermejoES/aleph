import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { randomUUID } from 'crypto'
import { eq } from 'drizzle-orm'
import { createTestDb, type TestDb } from '../../helpers/db'
import { campaigns } from '../../../server/db/schema/campaigns'
import { entities } from '../../../server/db/schema/entities'
import { maps, mapPins } from '../../../server/db/schema/maps'
import { user } from '../../../server/db/schema/auth'
import { backfillPinLabelEntityMatch } from '../../../server/db/backfills/pin-label-entity-match'

type Db = TestDb['db']

describe('backfillPinLabelEntityMatch (add-pin-rename/design.md D3)', () => {
  let testDb: TestDb
  let db: Db
  let campaignId: string
  let mapId: string
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

    mapId = randomUUID()
    db.insert(maps)
      .values({
        id: mapId,
        campaignId,
        name: 'Test Map',
        slug: 'test-map',
        createdAt: now,
        updatedAt: now,
      })
      .run()
  })

  afterEach(() => {
    testDb.close()
  })

  function seedEntity(name: string): string {
    const id = randomUUID()
    const now = new Date()
    db.insert(entities)
      .values({
        id,
        campaignId,
        type: 'location',
        name,
        slug: `${name.toLowerCase().replace(/\s+/g, '-')}-${id.slice(0, 6)}`,
        filePath: '',
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
      })
      .run()
    return id
  }

  function seedPin(overrides: { entityId?: string | null; label?: string | null }): string {
    const id = randomUUID()
    db.insert(mapPins)
      .values({
        id,
        mapId,
        entityId: overrides.entityId ?? null,
        label: overrides.label ?? null,
        lat: 0,
        lng: 0,
      })
      .run()
    return id
  }

  function labelOf(pinId: string): string | null {
    return db.select().from(mapPins).where(eq(mapPins.id, pinId)).get()?.label ?? null
  }

  it('nulls a label that matches its entity name exactly', () => {
    const entityId = seedEntity('Berghain')
    const pinId = seedPin({ entityId, label: 'Berghain' })

    const result = backfillPinLabelEntityMatch(db)

    expect(result.nulled).toBe(1)
    expect(labelOf(pinId)).toBeNull()
  })

  it('nulls a label that matches ignoring case and surrounding whitespace', () => {
    const entityId = seedEntity('Berghain')
    const pinId = seedPin({ entityId, label: '  berghain  ' })

    const result = backfillPinLabelEntityMatch(db)

    expect(result.nulled).toBe(1)
    expect(labelOf(pinId)).toBeNull()
  })

  it('leaves a label that genuinely differs from its entity name untouched', () => {
    const entityId = seedEntity('Bridge')
    const pinId = seedPin({ entityId, label: 'Old Bridge (destroyed)' })

    const result = backfillPinLabelEntityMatch(db)

    expect(result.nulled).toBe(0)
    expect(result.skipped).toBe(1)
    expect(labelOf(pinId)).toBe('Old Bridge (destroyed)')
  })

  it('leaves a pin with no linked entity untouched, even with a label', () => {
    const pinId = seedPin({ entityId: null, label: 'Whatever' })

    const result = backfillPinLabelEntityMatch(db)

    expect(result.nulled).toBe(0)
    expect(labelOf(pinId)).toBe('Whatever')
  })

  it('leaves a pin with a linked entity and no label untouched', () => {
    const entityId = seedEntity('Berghain')
    const pinId = seedPin({ entityId, label: null })

    const result = backfillPinLabelEntityMatch(db)

    expect(result.nulled).toBe(0)
    expect(labelOf(pinId)).toBeNull()
  })

  it('is idempotent: running it twice makes no further changes the second time', () => {
    const entityId = seedEntity('Berghain')
    const pinId = seedPin({ entityId, label: 'Berghain' })

    const first = backfillPinLabelEntityMatch(db)
    expect(first.nulled).toBe(1)

    const second = backfillPinLabelEntityMatch(db)
    expect(second.nulled).toBe(0)
    expect(labelOf(pinId)).toBeNull()
  })

  it('handles a mix of pins correctly in one run', () => {
    const berghain = seedEntity('Berghain')
    const bridge = seedEntity('Bridge')
    const matching = seedPin({ entityId: berghain, label: 'Berghain' })
    const custom = seedPin({ entityId: bridge, label: 'Old Bridge' })
    const noEntity = seedPin({ entityId: null, label: 'Free-floating note' })

    const result = backfillPinLabelEntityMatch(db)

    expect(result.nulled).toBe(1)
    expect(result.skipped).toBe(1)
    expect(labelOf(matching)).toBeNull()
    expect(labelOf(custom)).toBe('Old Bridge')
    expect(labelOf(noEntity)).toBe('Free-floating note')
  })
})
