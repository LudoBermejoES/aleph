import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createTestDb, type TestDb } from '../../helpers/db'
import { createOrganizationWithEntity } from '../../../server/services/organizations'
import {
  updateMemberRole,
  updateLocationOrgDescription,
} from '../../../server/services/organization-members'
import { organizationMembers, organizationLocations } from '../../../server/db/schema/organizations'
import { eq, and } from 'drizzle-orm'

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
  testDb.sqlite.exec(`
    INSERT INTO entities (id, campaign_id, type, name, slug, file_path, visibility, created_by, created_at, updated_at)
    VALUES ('char-1', 'camp-1', 'character', 'Hero', 'hero', '', 'members', 'user-1', ${NOW}, ${NOW})
  `)
  testDb.sqlite.exec(`
    INSERT INTO characters (id, entity_id, character_type)
    VALUES ('char-1', 'char-1', 'pc')
  `)
}

describe('updateMemberRole', () => {
  let testDb: TestDb
  let orgId: string

  beforeEach(() => {
    testDb = createTestDb()
    seed(testDb)
    const org = createOrganizationWithEntity(testDb.db, {
      campaignId: 'camp-1',
      name: 'Iron Circle',
      createdBy: 'user-1',
    })
    orgId = org.id
    testDb.db
      .insert(organizationMembers)
      .values({ organizationId: orgId, characterId: 'char-1', role: 'Knight' })
      .run()
  })

  afterEach(() => testDb.close())

  it('updates role to a new string', () => {
    const result = updateMemberRole(testDb.db, orgId, 'char-1', 'Commander')
    expect(result.role).toBe('Commander')
    const row = testDb.db
      .select()
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.organizationId, orgId),
          eq(organizationMembers.characterId, 'char-1'),
        ),
      )
      .get()
    expect(row?.role).toBe('Commander')
  })

  it('clears role when passed empty string', () => {
    const result = updateMemberRole(testDb.db, orgId, 'char-1', '')
    expect(result.role).toBeNull()
  })

  it('throws 404 when membership does not exist', () => {
    expect(() => updateMemberRole(testDb.db, orgId, 'nonexistent', 'Squire')).toThrow()
    try {
      updateMemberRole(testDb.db, orgId, 'nonexistent', 'Squire')
    } catch (e: unknown) {
      expect((e as { statusCode?: number }).statusCode).toBe(404)
    }
  })
})

describe('updateLocationOrgDescription', () => {
  let testDb: TestDb
  let orgId: string
  const locationEntityId = 'loc-entity-1'

  beforeEach(() => {
    testDb = createTestDb()
    seed(testDb)
    testDb.sqlite.exec(`
      INSERT INTO entities (id, campaign_id, type, name, slug, file_path, visibility, created_by, created_at, updated_at)
      VALUES ('${locationEntityId}', 'camp-1', 'location', 'The Shire', 'the-shire', '', 'members', 'user-1', ${NOW}, ${NOW})
    `)
    const org = createOrganizationWithEntity(testDb.db, {
      campaignId: 'camp-1',
      name: 'Grey Traders',
      createdBy: 'user-1',
    })
    orgId = org.id
    testDb.db
      .insert(organizationLocations)
      .values({ organizationId: orgId, locationEntityId, description: null })
      .run()
  })

  afterEach(() => testDb.close())

  it('updates description to a new string', () => {
    const result = updateLocationOrgDescription(testDb.db, locationEntityId, orgId, 'Seasonal post')
    expect(result.description).toBe('Seasonal post')
    const row = testDb.db
      .select()
      .from(organizationLocations)
      .where(
        and(
          eq(organizationLocations.organizationId, orgId),
          eq(organizationLocations.locationEntityId, locationEntityId),
        ),
      )
      .get()
    expect(row?.description).toBe('Seasonal post')
  })

  it('clears description when passed empty string', () => {
    const result = updateLocationOrgDescription(testDb.db, locationEntityId, orgId, '')
    expect(result.description).toBeNull()
  })

  it('throws 404 when link does not exist', () => {
    expect(() =>
      updateLocationOrgDescription(testDb.db, locationEntityId, 'nonexistent-org', 'x'),
    ).toThrow()
    try {
      updateLocationOrgDescription(testDb.db, locationEntityId, 'nonexistent-org', 'x')
    } catch (e: unknown) {
      expect((e as { statusCode?: number }).statusCode).toBe(404)
    }
  })
})
