import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { randomUUID } from 'crypto'
import { mkdirSync, writeFileSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { createTestDb, type TestDb } from '../../helpers/db'
import { unzipSync } from 'fflate'
import {
  buildCampaignExport,
  buildCampaignExportZip,
  collectImageUrls,
  embedImages,
  VALID_RESOURCE_TYPES,
  type CampaignExport,
} from '../../../server/services/campaign-export'
import { campaigns } from '../../../server/db/schema/campaigns'
import { entities } from '../../../server/db/schema/entities'
import { user } from '../../../server/db/schema/auth'
import { characters } from '../../../server/db/schema/characters'
import {
  organizations,
  organizationMembers,
  organizationLocations,
} from '../../../server/db/schema/organizations'

let testDb: TestDb
const userId = randomUUID()
const campaignId = randomUUID()

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
    expect(result.version).toBe('1.2')
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(Array.isArray((result as Record<string, any>)[key])).toBe(true)
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
    testDb.db
      .insert(entities)
      .values({
        id: entityId,
        campaignId,
        type: 'location',
        name: 'The Tavern',
        slug: 'the-tavern',
        filePath: '/tmp/the-tavern.md',
        visibility: 'members',
        createdBy: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .run()

    const result = await buildCampaignExport(testDb.db, { campaignId })
    expect(result.entities).toHaveLength(1)
    expect((result.entities as Record<string, unknown>[])[0].name).toBe('The Tavern')
  })

  it('exports organizations belonging to this campaign', async () => {
    const orgId = randomUUID()
    const now = new Date()
    testDb.db
      .insert(organizations)
      .values({
        id: orgId,
        campaignId,
        name: 'Thieves Guild',
        slug: 'thieves-guild',
        description: 'A shadowy guild',
        type: 'guild',
        status: 'active',
        createdAt: now,
        updatedAt: now,
      })
      .run()

    const result = await buildCampaignExport(testDb.db, { campaignId })
    expect(result.organizations).toHaveLength(1)
    expect((result.organizations as Record<string, unknown>[])[0].name).toBe('Thieves Guild')
  })

  it('exports organizationMembers for organizations in this campaign', async () => {
    const orgId = randomUUID()
    const entityId = randomUUID()
    const charId = randomUUID()
    const now = new Date()

    testDb.db
      .insert(entities)
      .values({
        id: entityId,
        campaignId,
        type: 'character',
        name: 'Rogue',
        slug: 'rogue',
        filePath: '/tmp/rogue.md',
        visibility: 'members',
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
      })
      .run()
    testDb.db
      .insert(characters)
      .values({ id: charId, entityId, characterType: 'npc', status: 'alive' })
      .run()
    testDb.db
      .insert(organizations)
      .values({
        id: orgId,
        campaignId,
        name: 'Guild',
        slug: 'guild',
        type: 'guild',
        status: 'active',
        createdAt: now,
        updatedAt: now,
      })
      .run()
    testDb.db
      .insert(organizationMembers)
      .values({ organizationId: orgId, characterId: charId, role: 'leader' })
      .run()

    const result = await buildCampaignExport(testDb.db, { campaignId })
    expect(result.organizationMembers).toHaveLength(1)
    expect((result.organizationMembers as Record<string, unknown>[])[0].role).toBe('leader')
  })

  it('exports organizationLocations for organizations in this campaign', async () => {
    const orgId = randomUUID()
    const entityId = randomUUID()
    const now = new Date()

    testDb.db
      .insert(entities)
      .values({
        id: entityId,
        campaignId,
        type: 'location',
        name: 'HQ',
        slug: 'hq',
        filePath: '/tmp/hq.md',
        visibility: 'members',
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
      })
      .run()
    testDb.db
      .insert(organizations)
      .values({
        id: orgId,
        campaignId,
        name: 'Guild',
        slug: 'guild',
        type: 'guild',
        status: 'active',
        createdAt: now,
        updatedAt: now,
      })
      .run()
    testDb.db
      .insert(organizationLocations)
      .values({ organizationId: orgId, locationEntityId: entityId })
      .run()

    const result = await buildCampaignExport(testDb.db, { campaignId })
    expect(result.organizationLocations).toHaveLength(1)
    expect((result.organizationLocations as Record<string, unknown>[])[0].locationEntityId).toBe(
      entityId,
    )
  })

  it('does not export entities from another campaign', async () => {
    const otherCampaignId = randomUUID()
    testDb.db
      .insert(campaigns)
      .values({
        id: otherCampaignId,
        name: 'Other Campaign',
        slug: 'other-campaign',
        contentDir: '/tmp/other',
        createdBy: userId,
        isPublic: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .run()
    testDb.db
      .insert(entities)
      .values({
        id: randomUUID(),
        campaignId: otherCampaignId,
        type: 'location',
        name: 'Other Entity',
        slug: 'other-entity',
        filePath: '/tmp/other-entity.md',
        visibility: 'members',
        createdBy: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .run()

    const result = await buildCampaignExport(testDb.db, { campaignId })
    expect(result.entities).toHaveLength(0)
  })
})

// ─── collectImageUrls ─────────────────────────────────────────────────────────

describe('collectImageUrls', () => {
  it('collects imageUrl from entities', () => {
    const data: Partial<CampaignExport> = {
      entities: [{ imageUrl: '/api/campaigns/c1/images/ent.png' }],
    }
    expect(collectImageUrls(data as CampaignExport)).toContain('/api/campaigns/c1/images/ent.png')
  })

  it('collects portraitUrl from characters', () => {
    const data: Partial<CampaignExport> = {
      characters: [{ portraitUrl: '/api/campaigns/c1/images/char.png' }],
    }
    expect(collectImageUrls(data as CampaignExport)).toContain('/api/campaigns/c1/images/char.png')
  })

  it('collects imageUrl from subCampaigns', () => {
    const data: Partial<CampaignExport> = {
      subCampaigns: [{ imageUrl: '/api/campaigns/c1/images/sg.png' }],
    }
    expect(collectImageUrls(data as CampaignExport)).toContain('/api/campaigns/c1/images/sg.png')
  })

  it('collects imagePath from maps', () => {
    const data: Partial<CampaignExport> = {
      maps: [{ imagePath: '/api/campaigns/c1/images/map.png' }],
    }
    expect(collectImageUrls(data as CampaignExport)).toContain('/api/campaigns/c1/images/map.png')
  })

  it('collects imagePath from items', () => {
    const data: Partial<CampaignExport> = {
      items: [{ imagePath: '/api/campaigns/c1/images/item.png' }],
    }
    expect(collectImageUrls(data as CampaignExport)).toContain('/api/campaigns/c1/images/item.png')
  })

  it('deduplicates URLs appearing in multiple resources', () => {
    const url = '/api/campaigns/c1/images/shared.png'
    const data: Partial<CampaignExport> = {
      entities: [{ imageUrl: url }],
      maps: [{ imagePath: url }],
    }
    const result = collectImageUrls(data as CampaignExport)
    expect(result.filter((u) => u === url)).toHaveLength(1)
  })

  it('ignores null / undefined image fields', () => {
    const data: Partial<CampaignExport> = {
      entities: [{ imageUrl: null }, { imageUrl: undefined }],
      characters: [{ portraitUrl: null }],
    }
    expect(collectImageUrls(data as CampaignExport)).toHaveLength(0)
  })

  it('returns empty array when all arrays are empty', () => {
    const data: Partial<CampaignExport> = {
      entities: [],
      characters: [],
      subCampaigns: [],
      maps: [],
      items: [],
    }
    expect(collectImageUrls(data as CampaignExport)).toHaveLength(0)
  })
})

// ─── embedImages ──────────────────────────────────────────────────────────────

describe('embedImages', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = join(tmpdir(), `aleph-test-${randomUUID()}`)
    mkdirSync(join(tmpDir, 'images'), { recursive: true })
  })

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true })
  })

  it('reads a file and returns a base64 data URI', () => {
    writeFileSync(join(tmpDir, 'images', 'hero.png'), Buffer.from([0x89, 0x50, 0x4e, 0x47]))
    const url = '/api/campaigns/c1/images/hero.png'
    const result = embedImages([url], tmpDir)
    expect(result[url]).toMatch(/^data:image\/png;base64,/)
  })

  it('silently skips a missing file', () => {
    const url = '/api/campaigns/c1/images/missing.png'
    const result = embedImages([url], tmpDir)
    expect(result[url]).toBeUndefined()
  })

  it('returns empty object for empty url list', () => {
    expect(embedImages([], tmpDir)).toEqual({})
  })

  it('produces a valid base64 round-trip', () => {
    const original = Buffer.from('hello image')
    writeFileSync(join(tmpDir, 'images', 'test.png'), original)
    const url = '/api/campaigns/c1/images/test.png'
    const result = embedImages([url], tmpDir)
    const dataUri = result[url]!
    const b64 = dataUri.replace(/^data:[^;]+;base64,/, '')
    expect(Buffer.from(b64, 'base64').toString()).toBe('hello image')
  })
})

// ─── buildCampaignExportZip ───────────────────────────────────────────────────

describe('buildCampaignExportZip', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = join(tmpdir(), `aleph-zip-test-${randomUUID()}`)
    mkdirSync(join(tmpDir, 'images'), { recursive: true })
    testDb.sqlite
      .prepare('UPDATE campaigns SET content_dir = ? WHERE id = ?')
      .run(tmpDir, campaignId)
  })

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true })
  })

  it('returns a Buffer', async () => {
    const buf = await buildCampaignExportZip(testDb.db, { campaignId })
    expect(Buffer.isBuffer(buf)).toBe(true)
    expect(buf.length).toBeGreaterThan(0)
  })

  it('ZIP contains campaign.json with version 1.2', async () => {
    const buf = await buildCampaignExportZip(testDb.db, { campaignId })
    const unzipped = unzipSync(new Uint8Array(buf))
    expect(unzipped['campaign.json']).toBeDefined()
    const json = JSON.parse(Buffer.from(unzipped['campaign.json']!).toString('utf8'))
    expect(json.version).toBe('1.2')
    expect(json.generator).toBe('aleph')
    expect(json.campaign).toMatchObject({ id: campaignId })
  })

  it('ZIP contains image-map.json', async () => {
    const buf = await buildCampaignExportZip(testDb.db, { campaignId })
    const unzipped = unzipSync(new Uint8Array(buf))
    expect(unzipped['image-map.json']).toBeDefined()
  })

  it('ZIP includes image file when entity has imageUrl', async () => {
    const imageBytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    writeFileSync(join(tmpDir, 'images', 'hero.png'), imageBytes)

    testDb.sqlite
      .prepare(
        `INSERT INTO entities (id, campaign_id, type, name, slug, file_path, visibility, created_by, created_at, updated_at, image_url)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        randomUUID(),
        campaignId,
        'location',
        'Hero',
        'hero',
        '/tmp/hero.md',
        'members',
        userId,
        new Date().toISOString(),
        new Date().toISOString(),
        `/api/campaigns/${campaignId}/images/hero.png`,
      )

    const buf = await buildCampaignExportZip(testDb.db, { campaignId })
    const unzipped = unzipSync(new Uint8Array(buf))
    expect(unzipped['images/hero.png']).toBeDefined()
    expect(Buffer.from(unzipped['images/hero.png']!)).toEqual(imageBytes)

    const imageMap = JSON.parse(Buffer.from(unzipped['image-map.json']!).toString('utf8'))
    expect(imageMap['images/hero.png']).toBe(`/api/campaigns/${campaignId}/images/hero.png`)
  })

  it('campaign.json does not contain an images key', async () => {
    const buf = await buildCampaignExportZip(testDb.db, { campaignId })
    const unzipped = unzipSync(new Uint8Array(buf))
    const json = JSON.parse(Buffer.from(unzipped['campaign.json']!).toString('utf8'))
    expect(json).not.toHaveProperty('images')
  })
})
