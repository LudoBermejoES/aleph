import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { existsSync, rmSync } from 'fs'
import { join } from 'path'
import { randomUUID } from 'crypto'
import { eq } from 'drizzle-orm'
import { createTestDb, type TestDb } from '../../helpers/db'
import { campaigns } from '../../../server/db/schema/campaigns'
import { entities } from '../../../server/db/schema/entities'
import { characters } from '../../../server/db/schema/characters'
import { organizations } from '../../../server/db/schema/organizations'
import { user } from '../../../server/db/schema/auth'
import {
  addImage,
  deleteImage,
  listImages,
  updateImage,
  characterGalleryDir,
  orgGalleryDir,
} from '../../../server/services/entity-images'

type Db = TestDb['db']

const PNG = Buffer.from('89504e470d0a1a0a0000000d494844520000000100000001080600000', 'hex')

describe('entity-images — character entity type', () => {
  let testDb: TestDb
  let db: Db
  let contentDir: string
  let campaignId: string
  let entityId: string
  let userId: string
  const charSlug = 'frodo-baggins'

  beforeEach(async () => {
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
        type: 'character',
        name: 'Frodo',
        slug: charSlug,
        filePath: '',
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
      })
      .run()

    db.insert(characters)
      .values({ id: randomUUID(), entityId, characterType: 'pc', status: 'alive' })
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
      slug: charSlug,
      contentDir,
      data: PNG,
      ext: '.png',
      caption: caption ?? null,
      userId,
      entityKind: 'character',
    })
  }

  function mirroredPortraitUrl(): string | null {
    return (
      db
        .select({ p: characters.portraitUrl })
        .from(characters)
        .where(eq(characters.entityId, entityId))
        .get()?.p ?? null
    )
  }

  it('first character image becomes primary and mirrors to portraitUrl', async () => {
    const image = await add()

    expect(image.isPrimary).toBe(true)
    expect(existsSync(join(characterGalleryDir(contentDir, charSlug), image.filename))).toBe(true)
    expect(mirroredPortraitUrl()).toBe(image.url)
  })

  it('secondary character images do not disturb the mirror', async () => {
    const first = await add()
    await add()

    expect(mirroredPortraitUrl()).toBe(first.url)
  })

  it('promoting a character image updates portraitUrl', async () => {
    await add()
    const second = await add()

    updateImage(db, entityId, second.id, { isPrimary: true }, 'character')

    expect(mirroredPortraitUrl()).toBe(second.url)
  })

  it('deleting the primary character image promotes the survivor', async () => {
    const first = await add()
    const second = await add()

    await deleteImage(db, {
      entityId,
      imageId: first.id,
      slug: charSlug,
      contentDir,
      entityKind: 'character',
    })

    expect(listImages(db, entityId)[0]!.id).toBe(second.id)
    expect(mirroredPortraitUrl()).toBe(second.url)
  })

  it('deleting the last character image nulls portraitUrl', async () => {
    const only = await add()

    await deleteImage(db, {
      entityId,
      imageId: only.id,
      slug: charSlug,
      contentDir,
      entityKind: 'character',
    })

    expect(mirroredPortraitUrl()).toBeNull()
  })
})

describe('entity-images — organization entity type', () => {
  let testDb: TestDb
  let db: Db
  let contentDir: string
  let campaignId: string
  let entityId: string
  let orgId: string
  let userId: string
  const orgSlug = 'the-fellowship'

  beforeEach(async () => {
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
        type: 'organization',
        name: 'The Fellowship',
        slug: orgSlug,
        filePath: '',
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
      })
      .run()

    orgId = randomUUID()
    db.insert(organizations)
      .values({
        id: orgId,
        campaignId,
        entityId,
        name: 'The Fellowship',
        slug: orgSlug,
        type: 'faction',
        status: 'active',
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
      slug: orgSlug,
      contentDir,
      data: PNG,
      ext: '.png',
      caption: caption ?? null,
      userId,
      entityKind: 'organization',
    })
  }

  function mirroredImageUrl(): string | null {
    return (
      db
        .select({ u: organizations.imageUrl })
        .from(organizations)
        .where(eq(organizations.id, orgId))
        .get()?.u ?? null
    )
  }

  it('first org image becomes primary and mirrors to imageUrl', async () => {
    const image = await add()

    expect(image.isPrimary).toBe(true)
    expect(existsSync(join(orgGalleryDir(contentDir, orgSlug), image.filename))).toBe(true)
    expect(mirroredImageUrl()).toBe(image.url)
  })

  it('promoting an org image updates imageUrl', async () => {
    await add()
    const second = await add()

    updateImage(db, entityId, second.id, { isPrimary: true }, 'organization')

    expect(mirroredImageUrl()).toBe(second.url)
  })

  it('deleting the primary org image promotes the survivor', async () => {
    const first = await add()
    const second = await add()

    await deleteImage(db, {
      entityId,
      imageId: first.id,
      slug: orgSlug,
      contentDir,
      entityKind: 'organization',
    })

    expect(listImages(db, entityId)[0]!.id).toBe(second.id)
    expect(mirroredImageUrl()).toBe(second.url)
  })

  it('deleting the last org image nulls imageUrl', async () => {
    const only = await add()

    await deleteImage(db, {
      entityId,
      imageId: only.id,
      slug: orgSlug,
      contentDir,
      entityKind: 'organization',
    })

    expect(mirroredImageUrl()).toBeNull()
  })
})
