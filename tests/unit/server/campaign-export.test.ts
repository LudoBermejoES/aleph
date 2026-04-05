import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { randomUUID } from 'crypto'
import { createTestDb, type TestDb } from '../../helpers/db'
import { buildCampaignExport, VALID_RESOURCE_TYPES } from '../../../server/services/campaign-export'
import { campaigns } from '../../../server/db/schema/campaigns'
import { entities } from '../../../server/db/schema/entities'
import { user } from '../../../server/db/schema/auth'
import { characters } from '../../../server/db/schema/characters'

let testDb: TestDb
const userId = randomUUID()
const campaignId = randomUUID()

function setupBaseData() {
  testDb.db.insert(user).values({
    id: userId, name: 'Test DM', email: `dm-${Date.now()}@test.com`,
    emailVerified: true, createdAt: new Date(), updatedAt: new Date(),
  }).run()
  testDb.db.insert(campaigns).values({
    id: campaignId, name: 'Test Campaign', slug: 'test-campaign',
    contentDir: '/tmp/test', createdBy: userId, isPublic: false,
    createdAt: new Date(), updatedAt: new Date(),
  }).run()
}

beforeEach(() => {
  testDb = createTestDb()
  setupBaseData()
})

afterEach(() => {
  testDb.close()
})

describe('buildCampaignExport - envelope fields (task 7.1)', () => {
  it('returns correct envelope fields', async () => {
    const result = await buildCampaignExport(testDb.db, { campaignId })
    expect(result.version).toBe('1.0')
    expect(result.generator).toBe('aleph')
    expect(result.exportedAt).toBeTruthy()
    expect(new Date(result.exportedAt).toISOString()).toBe(result.exportedAt)
    expect(result.campaign).toMatchObject({ id: campaignId, name: 'Test Campaign' })
  })
})

describe('buildCampaignExport - full export (task 7.2)', () => {
  it('full export includes all resource type keys', async () => {
    const result = await buildCampaignExport(testDb.db, { campaignId })
    for (const key of VALID_RESOURCE_TYPES) {
      expect(result).toHaveProperty(key)
      expect(Array.isArray((result as any)[key])).toBe(true)
    }
  })

  it('full export returns empty arrays for empty campaign', async () => {
    const result = await buildCampaignExport(testDb.db, { campaignId })
    expect(result.entities).toHaveLength(0)
    expect(result.characters).toHaveLength(0)
    expect(result.sessions).toHaveLength(0)
  })
})

describe('buildCampaignExport - selective export (task 7.3)', () => {
  it('selective export includes only requested types plus campaign', async () => {
    const result = await buildCampaignExport(testDb.db, {
      campaignId,
      include: ['entities', 'characters'],
    })
    expect(result).toHaveProperty('entities')
    expect(result).toHaveProperty('characters')
    expect(result).toHaveProperty('campaign')
    // Other keys should not be present
    expect(result).not.toHaveProperty('sessions')
    expect(result).not.toHaveProperty('maps')
    expect(result).not.toHaveProperty('quests')
  })
})

describe('buildCampaignExport - invalid keys (task 7.4)', () => {
  it('selective export silently ignores invalid resource type keys', async () => {
    const result = await buildCampaignExport(testDb.db, {
      campaignId,
      include: ['entities', 'foobar', 'invalid_key'],
    })
    expect(result).toHaveProperty('entities')
    expect(result).not.toHaveProperty('foobar')
    expect(result).not.toHaveProperty('invalid_key')
  })

  it('all-invalid include results in only campaign envelope', async () => {
    const result = await buildCampaignExport(testDb.db, {
      campaignId,
      include: ['foobar'],
    })
    expect(result.campaign).toBeDefined()
    expect(result.entities).toBeUndefined()
  })
})

describe('buildCampaignExport - empty campaign (task 7.5)', () => {
  it('empty campaign returns valid JSON with empty arrays', async () => {
    const result = await buildCampaignExport(testDb.db, { campaignId })
    expect(result.entities).toEqual([])
    expect(result.characters).toEqual([])
    expect(result.sessions).toEqual([])
    expect(result.rolls).toEqual([])
    expect(result.maps).toEqual([])
  })
})

describe('buildCampaignExport - data correctness', () => {
  it('exports entities belonging to this campaign', async () => {
    const entityId = randomUUID()
    testDb.db.insert(entities).values({
      id: entityId, campaignId, type: 'location', name: 'The Tavern',
      slug: 'the-tavern', filePath: '/tmp/the-tavern.md',
      visibility: 'members', createdBy: userId,
      createdAt: new Date(), updatedAt: new Date(),
    }).run()

    const result = await buildCampaignExport(testDb.db, { campaignId })
    expect(result.entities).toHaveLength(1)
    expect((result.entities as any[])[0].name).toBe('The Tavern')
  })

  it('does not export entities from another campaign', async () => {
    const otherCampaignId = randomUUID()
    testDb.db.insert(campaigns).values({
      id: otherCampaignId, name: 'Other Campaign', slug: 'other-campaign',
      contentDir: '/tmp/other', createdBy: userId, isPublic: false,
      createdAt: new Date(), updatedAt: new Date(),
    }).run()
    testDb.db.insert(entities).values({
      id: randomUUID(), campaignId: otherCampaignId, type: 'location',
      name: 'Other Entity', slug: 'other-entity', filePath: '/tmp/other-entity.md',
      visibility: 'members', createdBy: userId,
      createdAt: new Date(), updatedAt: new Date(),
    }).run()

    const result = await buildCampaignExport(testDb.db, { campaignId })
    expect(result.entities).toHaveLength(0)
  })
})
