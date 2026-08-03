import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { existsSync, rmSync } from 'fs'
import { join } from 'path'
import { randomUUID } from 'crypto'
import { eq } from 'drizzle-orm'
import { createTestDb, type TestDb } from '../../helpers/db'
import { campaigns } from '../../../server/db/schema/campaigns'
import { entities } from '../../../server/db/schema/entities'
import { entityImages } from '../../../server/db/schema/entity-images'
import { user } from '../../../server/db/schema/auth'
import {
  addImage,
  deleteImage,
  galleryDir,
  listImages,
  updateImage,
} from '../../../server/services/entity-images'

type Db = TestDb['db']

// A 1×1 PNG — the bytes never matter to the service, only that a real file lands on disk.
const PNG = Buffer.from('89504e470d0a1a0a0000000d494844520000000100000001080600000', 'hex')

describe('entity-images service', () => {
  let testDb: TestDb
  let db: Db
  let contentDir: string
  let campaignId: string
  let entityId: string
  let userId: string
  const slug = 'the-shire'

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

    entityId = randomUUID()
    db.insert(entities)
      .values({
        id: entityId,
        campaignId,
        type: 'location',
        name: 'The Shire',
        slug,
        filePath: `${contentDir}/location/${slug}.md`,
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

  function add(caption?: string) {
    return addImage(db, {
      campaignId,
      entityId,
      slug,
      contentDir,
      data: PNG,
      ext: '.png',
      caption: caption ?? null,
      userId,
    })
  }

  function mirroredImageUrl(): string | null {
    return db.select().from(entities).where(eq(entities.id, entityId)).get()!.imageUrl ?? null
  }

  it('makes the first image of an empty gallery the primary and mirrors it', async () => {
    const image = await add()

    expect(image.isPrimary).toBe(true)
    expect(image.sortOrder).toBe(0)
    expect(existsSync(join(galleryDir(contentDir, slug), image.filename))).toBe(true)
    expect(mirroredImageUrl()).toBe(image.url)
  })

  it('appends later images without touching the primary', async () => {
    const first = await add()
    const second = await add()
    const third = await add()

    expect(second.isPrimary).toBe(false)
    expect(third.isPrimary).toBe(false)
    expect(second.sortOrder).toBe(1)
    expect(third.sortOrder).toBe(2)
    expect(mirroredImageUrl()).toBe(first.url)
  })

  it('gives each upload its own file even for the same source name', async () => {
    const a = await add()
    const b = await add()

    expect(a.filename).not.toBe(b.filename)
    expect(existsSync(join(galleryDir(contentDir, slug), a.filename))).toBe(true)
    expect(existsSync(join(galleryDir(contentDir, slug), b.filename))).toBe(true)
  })

  it('lists images by sortOrder', async () => {
    const first = await add()
    const second = await add()

    // Swap their orders, exactly as the UI does.
    updateImage(db, entityId, second.id, { sortOrder: first.sortOrder })
    updateImage(db, entityId, first.id, { sortOrder: second.sortOrder })

    expect(listImages(db, entityId).map((i) => i.id)).toEqual([second.id, first.id])
  })

  it('setting a new primary clears the old one and moves the mirror', async () => {
    const first = await add()
    const second = await add()

    updateImage(db, entityId, second.id, { isPrimary: true })

    const images = listImages(db, entityId)
    expect(images.find((i) => i.id === first.id)!.isPrimary).toBe(false)
    expect(images.find((i) => i.id === second.id)!.isPrimary).toBe(true)
    expect(mirroredImageUrl()).toBe(second.url)
  })

  it('never leaves two primaries', async () => {
    await add()
    const second = await add()
    const third = await add()

    updateImage(db, entityId, second.id, { isPrimary: true })
    updateImage(db, entityId, third.id, { isPrimary: true })

    expect(listImages(db, entityId).filter((i) => i.isPrimary)).toHaveLength(1)
  })

  it('edits a caption without disturbing order or primacy', async () => {
    const first = await add('old')
    await add()

    const updated = updateImage(db, entityId, first.id, { caption: 'The cellar door' })

    expect(updated!.caption).toBe('The cellar door')
    expect(updated!.isPrimary).toBe(true)
    expect(updated!.sortOrder).toBe(0)
  })

  it('deleting a non-primary leaves the mirror alone', async () => {
    const first = await add()
    const second = await add()

    await deleteImage(db, { entityId, imageId: second.id, slug, contentDir })

    expect(listImages(db, entityId).map((i) => i.id)).toEqual([first.id])
    expect(mirroredImageUrl()).toBe(first.url)
  })

  it('deleting the primary promotes the lowest-sortOrder survivor', async () => {
    const first = await add()
    const second = await add()
    await add()

    await deleteImage(db, { entityId, imageId: first.id, slug, contentDir })

    const images = listImages(db, entityId)
    expect(images[0]!.id).toBe(second.id)
    expect(images[0]!.isPrimary).toBe(true)
    expect(mirroredImageUrl()).toBe(second.url)
  })

  it('deleting the last image nulls the mirror', async () => {
    const only = await add()

    await deleteImage(db, { entityId, imageId: only.id, slug, contentDir })

    expect(listImages(db, entityId)).toEqual([])
    expect(mirroredImageUrl()).toBeNull()
  })

  it('unlinks the file on delete', async () => {
    const image = await add()
    const path = join(galleryDir(contentDir, slug), image.filename)

    await deleteImage(db, { entityId, imageId: image.id, slug, contentDir })

    expect(existsSync(path)).toBe(false)
  })

  it('survives a delete whose file is already gone', async () => {
    const image = await add()
    rmSync(join(galleryDir(contentDir, slug), image.filename))

    await expect(deleteImage(db, { entityId, imageId: image.id, slug, contentDir })).resolves.toBe(
      true,
    )
    expect(listImages(db, entityId)).toEqual([])
  })

  it('reports an unknown image rather than throwing', async () => {
    await add()

    expect(await deleteImage(db, { entityId, imageId: randomUUID(), slug, contentDir })).toBe(false)
    expect(updateImage(db, entityId, randomUUID(), { caption: 'x' })).toBeNull()
  })

  it('removes gallery rows when the location is deleted', async () => {
    await add()

    db.delete(entities).where(eq(entities.id, entityId)).run()

    expect(db.select().from(entityImages).all()).toEqual([])
  })
})
