import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createTestDb, type TestDb } from '../../helpers/db'
import { slugify } from '../../../server/services/content'
import { seedEntityTypes } from '../../../server/services/entity-types'
import { randomUUID } from 'crypto'

describe('Slug Uniqueness', () => {
  it('generates basic slug', () => {
    expect(slugify('Strahd von Zarovich')).toBe('strahd-von-zarovich')
  })

  it('duplicate names can be made unique with timestamp suffix', () => {
    const slug1 = slugify('Castle Ravenloft')
    const slug2 = `${slugify('Castle Ravenloft')}-${Date.now().toString(36)}`
    expect(slug1).toBe('castle-ravenloft')
    expect(slug2).toMatch(/^castle-ravenloft-[a-z0-9]+$/)
    expect(slug1).not.toBe(slug2)
  })
})

describe('Entity Type Seeding', () => {
  let testDb: TestDb

  beforeEach(() => {
    testDb = createTestDb()
    // Create a user and campaign for FK constraints
    const now = Date.now()
    testDb.sqlite.exec(`
      INSERT INTO user (id, name, email, email_verified, created_at, updated_at)
      VALUES ('user-1', 'dm', 'dm@test.com', 0, ${now}, ${now})
    `)
    testDb.sqlite.exec(`
      INSERT INTO campaigns (id, name, slug, content_dir, created_by, created_at, updated_at)
      VALUES ('camp-1', 'Test Campaign', 'test-campaign', '/content/campaigns/test', 'user-1', ${now}, ${now})
    `)
  })

  afterEach(() => {
    testDb.close()
  })

  it('creates all 9 built-in entity types for a campaign', () => {
    seedEntityTypes(testDb.db, 'camp-1')

    const types = testDb.sqlite.prepare(
      "SELECT * FROM entity_types WHERE campaign_id = 'camp-1' ORDER BY sort_order"
    ).all() as any[]

    expect(types).toHaveLength(9)
    expect(types[0].slug).toBe('character')
    expect(types[0].is_builtin).toBe(1)
    expect(types[1].slug).toBe('location')
    expect(types[8].slug).toBe('session')
  })

  it('all seeded types have is_builtin flag', () => {
    seedEntityTypes(testDb.db, 'camp-1')

    const nonBuiltin = testDb.sqlite.prepare(
      "SELECT * FROM entity_types WHERE campaign_id = 'camp-1' AND is_builtin = 0"
    ).all()

    expect(nonBuiltin).toHaveLength(0)
  })

  it('each type has a unique slug within the campaign', () => {
    seedEntityTypes(testDb.db, 'camp-1')

    const types = testDb.sqlite.prepare(
      "SELECT slug FROM entity_types WHERE campaign_id = 'camp-1'"
    ).all() as { slug: string }[]

    const slugs = types.map(t => t.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
  })

  it('types are scoped to campaign (different campaigns get their own)', () => {
    testDb.sqlite.exec(`
      INSERT INTO campaigns (id, name, slug, content_dir, created_by, created_at, updated_at)
      VALUES ('camp-2', 'Another Campaign', 'another', '/content/campaigns/another', 'user-1', ${Date.now()}, ${Date.now()})
    `)

    seedEntityTypes(testDb.db, 'camp-1')
    seedEntityTypes(testDb.db, 'camp-2')

    const camp1Types = testDb.sqlite.prepare(
      "SELECT * FROM entity_types WHERE campaign_id = 'camp-1'"
    ).all()
    const camp2Types = testDb.sqlite.prepare(
      "SELECT * FROM entity_types WHERE campaign_id = 'camp-2'"
    ).all()

    expect(camp1Types).toHaveLength(9)
    expect(camp2Types).toHaveLength(9)
  })
})
