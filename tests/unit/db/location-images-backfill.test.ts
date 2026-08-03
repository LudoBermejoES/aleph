import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdirSync, readdirSync, rmSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'
import { randomUUID } from 'crypto'
import { eq } from 'drizzle-orm'
import { createTestDb, type TestDb } from '../../helpers/db'
import { campaigns } from '../../../server/db/schema/campaigns'
import { entities } from '../../../server/db/schema/entities'
import { entityImages } from '../../../server/db/schema/entity-images'
import { user } from '../../../server/db/schema/auth'
import { backfillLocationImages } from '../../../server/db/backfills/location-images'
import { galleryDir } from '../../../server/services/entity-images'

type Db = TestDb['db']

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

describe('backfillLocationImages', () => {
  let testDb: TestDb
  let db: Db
  let contentDir: string
  let campaignId: string
  let userId: string

  beforeEach(() => {
    testDb = createTestDb()
    db = testDb.db
    const now = new Date()
    contentDir = join('var', 'test-tmp', randomUUID())

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
        contentDir,
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
      })
      .run()
  })

  afterEach(() => {
    testDb.close()
    rmSync(join(process.cwd(), contentDir), { recursive: true, force: true })
  })

  function seedLocation(slug: string, imageUrl: string | null, withFile: boolean) {
    const id = randomUUID()
    const now = new Date()
    db.insert(entities)
      .values({
        id,
        campaignId,
        type: 'location',
        name: slug,
        slug,
        filePath: `${contentDir}/location/${slug}.md`,
        imageUrl,
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
      })
      .run()

    if (withFile) {
      const dir = join(process.cwd(), contentDir, 'entities', slug)
      mkdirSync(dir, { recursive: true })
      writeFileSync(join(dir, 'image.png'), PNG)
    }
    return id
  }

  function legacyUrl(slug: string) {
    return `/api/campaigns/${campaignId}/locations/${slug}/../entities/${slug}/image`
  }

  it('turns an existing single image into the primary gallery image', async () => {
    const id = seedLocation(
      'rivendell',
      `/api/campaigns/${campaignId}/entities/rivendell/image`,
      true,
    )

    const result = await backfillLocationImages(db)

    expect(result.migrated).toBe(1)
    const rows = db.select().from(entityImages).where(eq(entityImages.entityId, id)).all()
    expect(rows).toHaveLength(1)
    expect(rows[0]!.isPrimary).toBe(true)
    expect(rows[0]!.sortOrder).toBe(0)

    // The mirror now points at the gallery URL, and the file is where the serve route looks.
    const entity = db.select().from(entities).where(eq(entities.id, id)).get()!
    expect(entity.imageUrl).toBe(rows[0]!.url)
    expect(existsSync(join(galleryDir(contentDir, 'rivendell'), rows[0]!.filename))).toBe(true)
  })

  it('copies rather than moves — the legacy file survives', async () => {
    seedLocation('moria', `/api/campaigns/${campaignId}/entities/moria/image`, true)

    await backfillLocationImages(db)

    expect(existsSync(join(process.cwd(), contentDir, 'entities', 'moria', 'image.png'))).toBe(true)
  })

  it('is idempotent — a second run changes nothing', async () => {
    seedLocation('bree', `/api/campaigns/${campaignId}/entities/bree/image`, true)

    await backfillLocationImages(db)
    const rowsAfterFirst = db.select().from(entityImages).all()
    const filesAfterFirst = readdirSync(galleryDir(contentDir, 'bree')).sort()

    const second = await backfillLocationImages(db)

    expect(second.migrated).toBe(0)
    expect(second.skippedExisting).toBe(1)
    expect(db.select().from(entityImages).all()).toEqual(rowsAfterFirst)
    expect(readdirSync(galleryDir(contentDir, 'bree')).sort()).toEqual(filesAfterFirst)
  })

  it('leaves a location without an image untouched', async () => {
    const id = seedLocation('gondor', null, false)

    const result = await backfillLocationImages(db)

    expect(result.migrated).toBe(0)
    expect(db.select().from(entityImages).where(eq(entityImages.entityId, id)).all()).toEqual([])
    expect(db.select().from(entities).where(eq(entities.id, id)).get()!.imageUrl).toBeNull()
  })

  it('does not abort when a source file is missing', async () => {
    seedLocation('lost', legacyUrl('lost'), false)
    seedLocation('found', `/api/campaigns/${campaignId}/entities/found/image`, true)

    const result = await backfillLocationImages(db)

    expect(result.skippedMissingFile).toBe(1)
    expect(result.migrated).toBe(1)
  })
})
