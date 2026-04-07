import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { randomUUID } from 'crypto'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createTestDb, type TestDb } from '../../helpers/db'
import {
  buildIdMap,
  resolveImportName,
  importCampaign,
} from '../../../server/services/campaign-import'
import type { CampaignExport } from '../../../server/services/campaign-export'
import { campaigns } from '../../../server/db/schema/campaigns'
import { entities } from '../../../server/db/schema/entities'
import { characters } from '../../../server/db/schema/characters'
import { campaignMembers } from '../../../server/db/schema/campaign-members'
import { sessionGroups, gameSessions } from '../../../server/db/schema/sessions'
import { entityRelations } from '../../../server/db/schema/relations'
import { user } from '../../../server/db/schema/auth'
import {
  organizations,
  organizationMembers,
  organizationLocations,
} from '../../../server/db/schema/organizations'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

let testDb: TestDb
const userId = randomUUID()

function makeMinimalExport(overrides: Partial<CampaignExport> = {}): CampaignExport {
  const campaignId = randomUUID()
  return {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    generator: 'aleph',
    campaign: {
      id: campaignId,
      name: 'Exported Campaign',
      slug: 'exported-campaign',
      description: null,
      isPublic: false,
      theme: null,
      contentDir: 'content/campaigns/exported-campaign',
      createdBy: 'some-other-user',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    ...overrides,
  }
}

beforeEach(() => {
  testDb = createTestDb()
  testDb.db
    .insert(user)
    .values({
      id: userId,
      name: 'Importer',
      email: `importer-${Date.now()}@test.com`,
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .run()
})

afterEach(() => {
  testDb.close()
})

describe('buildIdMap', () => {
  it('generates new IDs for all resources', () => {
    const oldCampaignId = randomUUID()
    const oldEntityId = randomUUID()
    const oldTagId = randomUUID()
    const payload = makeMinimalExport({
      campaign: { id: oldCampaignId, name: 'Test', slug: 'test' },
      entities: [
        {
          id: oldEntityId,
          campaignId: oldCampaignId,
          type: 'location',
          name: 'Place',
          slug: 'place',
          filePath: 'f',
          visibility: 'members',
          createdBy: userId,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      tags: [{ id: oldTagId, campaignId: oldCampaignId, name: 'Tag', slug: 'tag' }],
    })

    const idMap = buildIdMap(payload)
    expect(idMap.has(oldCampaignId)).toBe(true)
    expect(idMap.has(oldEntityId)).toBe(true)
    expect(idMap.has(oldTagId)).toBe(true)
    expect(idMap.get(oldCampaignId)).not.toBe(oldCampaignId)
    expect(idMap.get(oldEntityId)).not.toBe(oldEntityId)
    expect(idMap.get(oldTagId)).not.toBe(oldTagId)
  })

  it('assigns unique new IDs for all resources', () => {
    const ids = [randomUUID(), randomUUID(), randomUUID()]
    const payload = makeMinimalExport({
      tags: ids.map((id) => ({ id, campaignId: 'x', name: id, slug: id })),
    })
    const idMap = buildIdMap(payload)
    const newIds = ids.map((id) => idMap.get(id)!)
    const unique = new Set(newIds)
    expect(unique.size).toBe(ids.length)
  })
})

describe('importCampaign - ID remapping', () => {
  it('remaps all IDs — no collisions with originals', () => {
    const payload = makeMinimalExport()
    const oldId = (payload.campaign as Record<string, unknown>).id as string

    const result = importCampaign(testDb.db, { payload, importingUserId: userId })
    expect(result.id).not.toBe(oldId)

    const row = testDb.db
      .select()
      .from(campaigns)
      .all()
      .find((c) => c.id === result.id)
    expect(row).toBeDefined()
  })

  it('remaps entity.campaignId and character.entityId', () => {
    const oldCampaignId = randomUUID()
    const oldEntityId = randomUUID()
    const oldCharId = randomUUID()

    const payload = makeMinimalExport({
      campaign: { id: oldCampaignId, name: 'C', slug: 'c' },
      entities: [
        {
          id: oldEntityId,
          campaignId: oldCampaignId,
          type: 'character',
          name: 'Hero',
          slug: 'hero',
          filePath: 'f',
          visibility: 'members',
          createdBy: userId,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      characters: [
        {
          id: oldCharId,
          entityId: oldEntityId,
          characterType: 'pc',
          status: 'alive',
        },
      ],
    })

    importCampaign(testDb.db, { payload, importingUserId: userId })

    const allEntities = testDb.db.select().from(entities).all()
    const allChars = testDb.db.select().from(characters).all()
    expect(allEntities).toHaveLength(1)
    expect(allChars).toHaveLength(1)
    // entityId on character should point to the new entity, not the old one
    expect(allChars[0].entityId).toBe(allEntities[0].id)
    expect(allChars[0].entityId).not.toBe(oldEntityId)
    // campaignId on entity should be new
    expect(allEntities[0].campaignId).not.toBe(oldCampaignId)
  })

  it('remaps session.groupId and relation sourceEntityId/targetEntityId', () => {
    const oldCampaignId = randomUUID()
    const oldGroupId = randomUUID()
    const oldSessionId = randomUUID()
    const oldEntity1 = randomUUID()
    const oldEntity2 = randomUUID()
    const oldRelTypeId = randomUUID()
    const oldRelId = randomUUID()

    const payload = makeMinimalExport({
      campaign: { id: oldCampaignId, name: 'C', slug: 'c' },
      sessionGroups: [
        { id: oldGroupId, campaignId: oldCampaignId, name: 'Group', slug: 'group', sortOrder: 0 },
      ],
      sessions: [
        {
          id: oldSessionId,
          campaignId: oldCampaignId,
          title: 'Session 1',
          slug: 'session-1',
          sessionNumber: 1,
          status: 'completed',
          groupId: oldGroupId,
        },
      ],
      entities: [
        {
          id: oldEntity1,
          campaignId: oldCampaignId,
          type: 'location',
          name: 'A',
          slug: 'a',
          filePath: 'f',
          visibility: 'members',
          createdBy: userId,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: oldEntity2,
          campaignId: oldCampaignId,
          type: 'location',
          name: 'B',
          slug: 'b',
          filePath: 'f',
          visibility: 'members',
          createdBy: userId,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      relationTypes: [
        {
          id: oldRelTypeId,
          campaignId: oldCampaignId,
          slug: 'allied',
          forwardLabel: 'allied with',
          reverseLabel: 'allied with',
          isBuiltin: false,
        },
      ],
      relations: [
        {
          id: oldRelId,
          campaignId: oldCampaignId,
          sourceEntityId: oldEntity1,
          targetEntityId: oldEntity2,
          relationTypeId: oldRelTypeId,
          forwardLabel: 'allied with',
          reverseLabel: 'allied with',
          visibility: 'public',
          isPinned: false,
          attitude: 0,
          createdBy: userId,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    })

    importCampaign(testDb.db, { payload, importingUserId: userId })

    const allSessions = testDb.db.select().from(gameSessions).all()
    const allGroups = testDb.db.select().from(sessionGroups).all()
    const allRelations = testDb.db.select().from(entityRelations).all()
    const allEntities = testDb.db.select().from(entities).all()

    expect(allSessions[0].groupId).toBe(allGroups[0].id)
    expect(allSessions[0].groupId).not.toBe(oldGroupId)
    expect(allRelations[0].sourceEntityId).toBe(allEntities.find((e) => e.name === 'A')!.id)
    expect(allRelations[0].targetEntityId).toBe(allEntities.find((e) => e.name === 'B')!.id)
    expect(allRelations[0].sourceEntityId).not.toBe(oldEntity1)
  })
})

describe('importCampaign - partial export', () => {
  it('imports without error when resource type arrays are missing', () => {
    const payload = makeMinimalExport()
    // No entities, sessions, maps etc.
    expect(() => importCampaign(testDb.db, { payload, importingUserId: userId })).not.toThrow()
  })
})

describe('importCampaign - members are ignored', () => {
  it('does not create campaign members from export members array', () => {
    const payload = makeMinimalExport({
      members: [
        {
          id: randomUUID(),
          campaignId: 'old',
          userId: randomUUID(),
          role: 'player',
          joinedAt: new Date(),
        },
      ],
    })

    importCampaign(testDb.db, { payload, importingUserId: userId })

    const members = testDb.db.select().from(campaignMembers).all()
    expect(members).toHaveLength(1)
    expect(members[0].userId).toBe(userId)
    expect(members[0].role).toBe('dm')
  })
})

describe('resolveImportName', () => {
  it('returns the name unchanged when no conflict', () => {
    const name = resolveImportName(testDb.db, 'Unique Campaign', userId)
    expect(name).toBe('Unique Campaign')
  })

  it('appends import suffix when campaign name already exists for user', () => {
    testDb.db
      .insert(campaigns)
      .values({
        id: randomUUID(),
        name: 'Existing Campaign',
        slug: 'existing-campaign',
        contentDir: '/tmp/x',
        createdBy: userId,
        isPublic: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .run()

    const name = resolveImportName(testDb.db, 'Existing Campaign', userId)
    expect(name).toMatch(/Existing Campaign \(imported \d{4}-\d{2}-\d{2}\)/)
  })

  it('does not append suffix when same name exists for a different user', () => {
    const otherId = randomUUID()
    testDb.db
      .insert(user)
      .values({
        id: otherId,
        name: 'Other',
        email: `other-${Date.now()}@test.com`,
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .run()
    testDb.db
      .insert(campaigns)
      .values({
        id: randomUUID(),
        name: 'Shared Name',
        slug: 'shared-name',
        contentDir: '/tmp/y',
        createdBy: otherId,
        isPublic: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .run()

    const name = resolveImportName(testDb.db, 'Shared Name', userId)
    expect(name).toBe('Shared Name')
  })
})

describe('importCampaign - organizations', () => {
  it('imports organizations with remapped IDs', () => {
    const oldCampaignId = randomUUID()
    const oldOrgId = randomUUID()

    const payload = makeMinimalExport({
      campaign: { id: oldCampaignId, name: 'C', slug: 'c' },
      organizations: [
        {
          id: oldOrgId,
          campaignId: oldCampaignId,
          name: 'Thieves Guild',
          slug: 'thieves-guild',
          description: 'A shadowy guild',
          type: 'guild',
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    })

    importCampaign(testDb.db, { payload, importingUserId: userId })

    const allOrgs = testDb.db.select().from(organizations).all()
    expect(allOrgs).toHaveLength(1)
    expect(allOrgs[0].name).toBe('Thieves Guild')
    expect(allOrgs[0].id).not.toBe(oldOrgId)
    expect(allOrgs[0].campaignId).not.toBe(oldCampaignId)
  })

  it('imports organizationMembers with remapped IDs', () => {
    const oldCampaignId = randomUUID()
    const oldOrgId = randomUUID()
    const oldEntityId = randomUUID()
    const oldCharId = randomUUID()

    const payload = makeMinimalExport({
      campaign: { id: oldCampaignId, name: 'C', slug: 'c' },
      entities: [
        {
          id: oldEntityId,
          campaignId: oldCampaignId,
          type: 'character',
          name: 'Rogue',
          slug: 'rogue',
          filePath: 'f',
          visibility: 'members',
          createdBy: userId,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      characters: [{ id: oldCharId, entityId: oldEntityId, characterType: 'npc', status: 'alive' }],
      organizations: [
        {
          id: oldOrgId,
          campaignId: oldCampaignId,
          name: 'Guild',
          slug: 'guild',
          type: 'guild',
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      organizationMembers: [{ organizationId: oldOrgId, characterId: oldCharId, role: 'leader' }],
    })

    importCampaign(testDb.db, { payload, importingUserId: userId })

    const allOrgMembers = testDb.db.select().from(organizationMembers).all()
    expect(allOrgMembers).toHaveLength(1)
    expect(allOrgMembers[0].role).toBe('leader')
    // IDs should be remapped
    expect(allOrgMembers[0].organizationId).not.toBe(oldOrgId)
    expect(allOrgMembers[0].characterId).not.toBe(oldCharId)
    // Should point to actual imported records
    const allOrgs = testDb.db.select().from(organizations).all()
    const allChars = testDb.db.select().from(characters).all()
    expect(allOrgMembers[0].organizationId).toBe(allOrgs[0].id)
    expect(allOrgMembers[0].characterId).toBe(allChars[0].id)
  })

  it('imports organizationLocations with remapped IDs', () => {
    const oldCampaignId = randomUUID()
    const oldOrgId = randomUUID()
    const oldEntityId = randomUUID()

    const payload = makeMinimalExport({
      campaign: { id: oldCampaignId, name: 'C', slug: 'c' },
      entities: [
        {
          id: oldEntityId,
          campaignId: oldCampaignId,
          type: 'location',
          name: 'HQ',
          slug: 'hq',
          filePath: 'f',
          visibility: 'members',
          createdBy: userId,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      organizations: [
        {
          id: oldOrgId,
          campaignId: oldCampaignId,
          name: 'Guild',
          slug: 'guild',
          type: 'guild',
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      organizationLocations: [{ organizationId: oldOrgId, locationEntityId: oldEntityId }],
    })

    importCampaign(testDb.db, { payload, importingUserId: userId })

    const allOrgLocs = testDb.db.select().from(organizationLocations).all()
    expect(allOrgLocs).toHaveLength(1)
    expect(allOrgLocs[0].organizationId).not.toBe(oldOrgId)
    expect(allOrgLocs[0].locationEntityId).not.toBe(oldEntityId)
    // Should point to actual imported records
    const allOrgs = testDb.db.select().from(organizations).all()
    const allEntities = testDb.db.select().from(entities).all()
    expect(allOrgLocs[0].organizationId).toBe(allOrgs[0].id)
    expect(allOrgLocs[0].locationEntityId).toBe(allEntities[0].id)
  })

  it('buildIdMap registers organization IDs', () => {
    const oldOrgId = randomUUID()
    const payload = makeMinimalExport({
      organizations: [
        {
          id: oldOrgId,
          campaignId: 'x',
          name: 'Org',
          slug: 'org',
          type: 'faction',
          status: 'active',
        },
      ],
    })
    const idMap = buildIdMap(payload)
    expect(idMap.has(oldOrgId)).toBe(true)
    expect(idMap.get(oldOrgId)).not.toBe(oldOrgId)
  })
})

describe('importCampaign - full real export fixture', () => {
  it('imports the full La Fuerza Oculta campaign without error and counts resources', () => {
    const payload = JSON.parse(
      readFileSync(resolve(__dirname, '../../fixtures/campaign-export-full.json'), 'utf-8'),
    ) as CampaignExport
    const result = importCampaign(testDb.db, { payload, importingUserId: userId })
    expect(result.id).toBeTruthy()
    expect(result.name).toBeTruthy()

    // Spot-check resource counts match original
    const allEntities = testDb.db.select().from(entities).all()
    const allSessions = testDb.db.select().from(gameSessions).all()
    expect(allEntities).toHaveLength((payload.entities ?? []).length)
    expect(allSessions).toHaveLength((payload.sessions ?? []).length)

    // No original IDs should appear in the new DB
    const originalEntityIds = new Set(
      (payload.entities ?? []).map((e: Record<string, unknown>) => e.id as string),
    )
    for (const e of allEntities) {
      expect(originalEntityIds.has(e.id)).toBe(false)
    }
  })
})
