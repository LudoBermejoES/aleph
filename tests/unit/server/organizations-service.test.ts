import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createTestDb, type TestDb } from '../../helpers/db'
import {
  createOrganizationWithEntity,
  updateOrganizationWithEntity,
  deleteOrganizationWithEntity,
} from '../../../server/services/organizations'
import { organizations } from '../../../server/db/schema/organizations'
import { entities } from '../../../server/db/schema/entities'
import { eq } from 'drizzle-orm'

const NOW = Date.now()

function seed(testDb: TestDb) {
  testDb.sqlite.exec(`
    INSERT INTO user (id, name, email, email_verified, created_at, updated_at)
    VALUES ('user-1', 'DM', 'dm@test.com', 0, ${NOW}, ${NOW})
  `)
  testDb.sqlite.exec(`
    INSERT INTO campaigns (id, name, slug, content_dir, created_by, created_at, updated_at)
    VALUES ('camp-1', 'Test', 'test', '/tmp/test', 'user-1', ${NOW}, ${NOW})
  `)
}

describe('createOrganizationWithEntity', () => {
  let testDb: TestDb

  beforeEach(() => {
    testDb = createTestDb()
    seed(testDb)
  })
  afterEach(() => testDb.close())

  it('creates both an org row and an entity row', () => {
    const org = createOrganizationWithEntity(testDb.db, {
      campaignId: 'camp-1',
      name: 'Black Hand',
      createdBy: 'user-1',
    })

    expect(org.id).toBeTruthy()
    expect(org.entityId).toBe(org.id)
    expect(org.slug).toBe('black-hand')

    const entity = testDb.db.select().from(entities).where(eq(entities.id, org.id)).get()
    expect(entity).toBeTruthy()
    expect(entity!.type).toBe('organization')
    expect(entity!.slug).toBe('black-hand')
    expect(entity!.campaignId).toBe('camp-1')
  })

  it('uses <slug>-org suffix on entity when slug is already taken by another entity', () => {
    // Pre-insert an entity with the same slug
    testDb.sqlite.exec(`
      INSERT INTO entities (id, campaign_id, type, name, slug, file_path, visibility, created_by, created_at, updated_at)
      VALUES ('existing-1', 'camp-1', 'character', 'Black Hand', 'black-hand', '', 'members', 'user-1', ${NOW}, ${NOW})
    `)

    const org = createOrganizationWithEntity(testDb.db, {
      campaignId: 'camp-1',
      name: 'Black Hand',
      createdBy: 'user-1',
    })

    // Org slug stays as-is
    expect(org.slug).toBe('black-hand')
    // Entity row gets -org suffix
    const entity = testDb.db.select().from(entities).where(eq(entities.id, org.id)).get()
    expect(entity!.slug).toBe('black-hand-org')
  })

  it('stores the provided visibility on the mirror entity', () => {
    const org = createOrganizationWithEntity(testDb.db, {
      campaignId: 'camp-1',
      name: 'Black Hand',
      createdBy: 'user-1',
      visibility: 'dm_only',
    })

    const entity = testDb.db.select().from(entities).where(eq(entities.id, org.id)).get()!
    expect(entity.visibility).toBe('dm_only')
  })

  it('defaults visibility to members when not specified', () => {
    const org = createOrganizationWithEntity(testDb.db, {
      campaignId: 'camp-1',
      name: 'Black Hand',
      createdBy: 'user-1',
    })

    const entity = testDb.db.select().from(entities).where(eq(entities.id, org.id)).get()!
    expect(entity.visibility).toBe('members')
  })

  it('throws 409 if an org with the same slug already exists', () => {
    createOrganizationWithEntity(testDb.db, {
      campaignId: 'camp-1',
      name: 'Black Hand',
      createdBy: 'user-1',
    })

    expect(() =>
      createOrganizationWithEntity(testDb.db, {
        campaignId: 'camp-1',
        name: 'Black Hand',
        createdBy: 'user-1',
      }),
    ).toThrow()
  })
})

describe('updateOrganizationWithEntity', () => {
  let testDb: TestDb
  let orgId: string

  beforeEach(() => {
    testDb = createTestDb()
    seed(testDb)
    const org = createOrganizationWithEntity(testDb.db, {
      campaignId: 'camp-1',
      name: 'Black Hand',
      createdBy: 'user-1',
    })
    orgId = org.id
  })
  afterEach(() => testDb.close())

  it('syncs name and slug on both rows', () => {
    updateOrganizationWithEntity(testDb.db, 'camp-1', orgId, { name: 'White Hand' })

    const org = testDb.db.select().from(organizations).where(eq(organizations.id, orgId)).get()!
    const entity = testDb.db.select().from(entities).where(eq(entities.id, orgId)).get()!

    expect(org.name).toBe('White Hand')
    expect(org.slug).toBe('white-hand')
    expect(entity.name).toBe('White Hand')
    expect(entity.slug).toBe('white-hand')
  })

  it('uses <slug>-org suffix on entity when new slug is taken by another entity', () => {
    testDb.sqlite.exec(`
      INSERT INTO entities (id, campaign_id, type, name, slug, file_path, visibility, created_by, created_at, updated_at)
      VALUES ('other-1', 'camp-1', 'character', 'White Hand', 'white-hand', '', 'members', 'user-1', ${NOW}, ${NOW})
    `)

    updateOrganizationWithEntity(testDb.db, 'camp-1', orgId, { name: 'White Hand' })

    const entity = testDb.db.select().from(entities).where(eq(entities.id, orgId)).get()!
    expect(entity.slug).toBe('white-hand-org')

    // Org slug stays without suffix
    const org = testDb.db.select().from(organizations).where(eq(organizations.id, orgId)).get()!
    expect(org.slug).toBe('white-hand')
  })

  it('updates description without touching slug', () => {
    updateOrganizationWithEntity(testDb.db, 'camp-1', orgId, {
      description: 'A secretive guild',
    })

    const org = testDb.db.select().from(organizations).where(eq(organizations.id, orgId)).get()!
    expect(org.description).toBe('A secretive guild')
    expect(org.slug).toBe('black-hand')
  })

  it('updates the mirror entity visibility', () => {
    updateOrganizationWithEntity(testDb.db, 'camp-1', orgId, { visibility: 'dm_only' })

    const entity = testDb.db.select().from(entities).where(eq(entities.id, orgId)).get()!
    expect(entity.visibility).toBe('dm_only')
  })

  it('leaves visibility untouched when not included in the patch', () => {
    updateOrganizationWithEntity(testDb.db, 'camp-1', orgId, { visibility: 'dm_only' })
    updateOrganizationWithEntity(testDb.db, 'camp-1', orgId, { description: 'Updated desc' })

    const entity = testDb.db.select().from(entities).where(eq(entities.id, orgId)).get()!
    expect(entity.visibility).toBe('dm_only')
  })
})

describe('deleteOrganizationWithEntity', () => {
  let testDb: TestDb
  let orgId: string

  beforeEach(() => {
    testDb = createTestDb()
    seed(testDb)
    const org = createOrganizationWithEntity(testDb.db, {
      campaignId: 'camp-1',
      name: 'Black Hand',
      createdBy: 'user-1',
    })
    orgId = org.id
  })
  afterEach(() => testDb.close())

  it('removes both the org row and its paired entity row', () => {
    deleteOrganizationWithEntity(testDb.db, orgId)

    const org = testDb.db.select().from(organizations).where(eq(organizations.id, orgId)).get()
    const entity = testDb.db.select().from(entities).where(eq(entities.id, orgId)).get()

    expect(org).toBeUndefined()
    expect(entity).toBeUndefined()
  })
})
