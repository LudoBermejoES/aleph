import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  filterPinsByVisibility,
  validateMapImage,
  computeBreadcrumb,
  getPinsWithEntity,
  getPinWithEntity,
} from '../../../server/services/maps'
import { createTestDb, type TestDb } from '../../helpers/db'

describe('filterPinsByVisibility', () => {
  const pins = [
    { id: '1', label: 'Visible Town', visibility: 'public' },
    { id: '2', label: 'Secret Lair', visibility: 'dm_only' },
    { id: '3', label: 'Members Camp', visibility: 'members' },
    { id: '4', label: 'Editor Note', visibility: 'editors' },
  ]

  it('DM sees all pins', () => {
    expect(filterPinsByVisibility(pins, 'dm')).toHaveLength(4)
  })

  it('co_dm sees all pins', () => {
    expect(filterPinsByVisibility(pins, 'co_dm')).toHaveLength(4)
  })

  it('editor sees public, members, and editors pins', () => {
    const result = filterPinsByVisibility(pins, 'editor')
    expect(result).toHaveLength(3)
    expect(result.find((p) => p.visibility === 'dm_only')).toBeUndefined()
  })

  it('player sees public and members pins', () => {
    const result = filterPinsByVisibility(pins, 'player')
    expect(result).toHaveLength(2)
    expect(result.map((p) => p.visibility)).toEqual(['public', 'members'])
  })

  it('visitor sees only public pins', () => {
    const result = filterPinsByVisibility(pins, 'visitor')
    expect(result).toHaveLength(1)
    expect(result[0].visibility).toBe('public')
  })

  it('empty pins returns empty', () => {
    expect(filterPinsByVisibility([], 'player')).toEqual([])
  })
})

describe('validateMapImage', () => {
  it('accepts valid PNG', () => {
    const result = validateMapImage({ mimetype: 'image/png', size: 5_000_000 })
    expect(result.valid).toBe(true)
  })

  it('accepts valid JPEG', () => {
    const result = validateMapImage({ mimetype: 'image/jpeg', size: 1_000_000 })
    expect(result.valid).toBe(true)
  })

  it('accepts valid WebP', () => {
    const result = validateMapImage({ mimetype: 'image/webp', size: 2_000_000 })
    expect(result.valid).toBe(true)
  })

  it('rejects unsupported formats', () => {
    const result = validateMapImage({ mimetype: 'image/gif', size: 100_000 })
    expect(result.valid).toBe(false)
    expect(result.error).toContain('format')
  })

  it('rejects files exceeding max size (100MB)', () => {
    const result = validateMapImage({ mimetype: 'image/png', size: 150_000_000 })
    expect(result.valid).toBe(false)
    expect(result.error).toContain('size')
  })

  it('accepts files at exactly max size', () => {
    const result = validateMapImage({ mimetype: 'image/png', size: 100_000_000 })
    expect(result.valid).toBe(true)
  })
})

describe('computeBreadcrumb', () => {
  let testDb: TestDb

  beforeEach(() => {
    testDb = createTestDb()
    const now = Date.now()
    testDb.sqlite.exec(`
      INSERT INTO user (id, name, email, email_verified, created_at, updated_at)
      VALUES ('user-1', 'DM', 'dm@test.com', 0, ${now}, ${now})
    `)
    testDb.sqlite.exec(`
      INSERT INTO campaigns (id, name, slug, content_dir, created_by, created_at, updated_at)
      VALUES ('camp-1', 'Test', 'test', '/content', 'user-1', ${now}, ${now})
    `)
  })

  afterEach(() => {
    testDb.close()
  })

  it('returns single element for root map', () => {
    testDb.sqlite.exec(`
      INSERT INTO maps (id, campaign_id, name, slug, visibility, created_at, updated_at)
      VALUES ('map-root', 'camp-1', 'World Map', 'world-map', 'public', ${Date.now()}, ${Date.now()})
    `)
    const breadcrumb = computeBreadcrumb(testDb.sqlite, 'map-root')
    expect(breadcrumb).toHaveLength(1)
    expect(breadcrumb[0].name).toBe('World Map')
  })

  it('returns correct ancestor chain for 3 levels', () => {
    const now = Date.now()
    testDb.sqlite.exec(`
      INSERT INTO maps (id, campaign_id, name, slug, parent_map_id, visibility, created_at, updated_at)
      VALUES ('map-world', 'camp-1', 'World', 'world', NULL, 'public', ${now}, ${now}),
             ('map-region', 'camp-1', 'Barovia', 'barovia', 'map-world', 'public', ${now}, ${now}),
             ('map-city', 'camp-1', 'Vallaki', 'vallaki', 'map-region', 'public', ${now}, ${now})
    `)
    const breadcrumb = computeBreadcrumb(testDb.sqlite, 'map-city')
    expect(breadcrumb).toHaveLength(3)
    expect(breadcrumb[0].name).toBe('World')
    expect(breadcrumb[1].name).toBe('Barovia')
    expect(breadcrumb[2].name).toBe('Vallaki')
  })

  it('returns empty for nonexistent map', () => {
    const breadcrumb = computeBreadcrumb(testDb.sqlite, 'nonexistent')
    expect(breadcrumb).toHaveLength(0)
  })
})

// design.md D3 (improve-map-pin-markers-and-deletion): the pins GET join must not leak an
// entity the viewer cannot see. These exercise the real LEFT JOIN + visibility strip against
// an in-memory DB, not just the pure isEntityVisibleTo predicate.
describe('getPinsWithEntity / getPinWithEntity (design.md D3)', () => {
  let testDb: TestDb

  beforeEach(() => {
    testDb = createTestDb()
    const now = Date.now()
    testDb.sqlite.exec(`
      INSERT INTO user (id, name, email, email_verified, created_at, updated_at) VALUES
        ('user-owner', 'Owner', 'owner@test.com', 0, ${now}, ${now}),
        ('user-player', 'Player', 'player@test.com', 0, ${now}, ${now})
    `)
    testDb.sqlite.exec(`
      INSERT INTO campaigns (id, name, slug, content_dir, created_by, created_at, updated_at)
      VALUES ('camp-1', 'Test', 'test', '/content', 'user-owner', ${now}, ${now})
    `)
    testDb.sqlite.exec(`
      INSERT INTO maps (id, campaign_id, name, slug, visibility, created_at, updated_at)
      VALUES ('map-1', 'camp-1', 'World Map', 'world-map', 'public', ${now}, ${now})
    `)
    testDb.sqlite.exec(`
      INSERT INTO entities (id, campaign_id, type, name, slug, file_path, visibility, image_url, created_by, created_at, updated_at) VALUES
        ('ent-public', 'camp-1', 'character', 'Public Hero', 'public-hero', '/f1', 'public', '/img/hero.webp', 'user-owner', ${now}, ${now}),
        ('ent-no-image', 'camp-1', 'location', 'Bare Location', 'bare-location', '/f2', 'public', NULL, 'user-owner', ${now}, ${now}),
        ('ent-private', 'camp-1', 'character', 'Owner Secret', 'owner-secret', '/f3', 'private', '/img/secret.webp', 'user-owner', ${now}, ${now}),
        ('ent-dm-only', 'camp-1', 'faction', 'DM Only Cabal', 'dm-only-cabal', '/f4', 'dm_only', '/img/cabal.webp', 'user-owner', ${now}, ${now})
    `)
    testDb.sqlite.exec(`
      INSERT INTO map_pins (id, map_id, entity_id, label, lat, lng, visibility) VALUES
        ('pin-public', 'map-1', 'ent-public', 'Public pin', 1, 1, 'public'),
        ('pin-no-image', 'map-1', 'ent-no-image', 'No image pin', 2, 2, 'public'),
        ('pin-private', 'map-1', 'ent-private', 'Private-entity pin', 3, 3, 'public'),
        ('pin-dm-entity', 'map-1', 'ent-dm-only', 'DM-only-entity pin', 4, 4, 'public'),
        ('pin-no-entity', 'map-1', NULL, 'No entity pin', 5, 5, 'public'),
        ('pin-dm-only-visibility', 'map-1', 'ent-public', 'Hidden pin itself', 6, 6, 'dm_only')
    `)
  })

  afterEach(() => {
    testDb.close()
  })

  it('co_dm+ sees every pin and every linked entity, including private and dm_only ones', () => {
    const pins = getPinsWithEntity(testDb.db, 'map-1', 'dm', 'user-player')
    expect(pins).toHaveLength(6)
    const byId = Object.fromEntries(pins.map((p) => [p.id, p]))
    expect(byId['pin-public'].entityImageUrl).toBe('/img/hero.webp')
    expect(byId['pin-private'].entityImageUrl).toBe('/img/secret.webp')
    expect(byId['pin-dm-entity'].entityImageUrl).toBe('/img/cabal.webp')
  })

  it("a player sees the pin but not a private entity's image/type unless they created it", () => {
    const pins = getPinsWithEntity(testDb.db, 'map-1', 'player', 'user-player')
    // The dm_only-visibility PIN itself is excluded entirely -- unrelated to entity visibility.
    expect(pins.find((p) => p.id === 'pin-dm-only-visibility')).toBeUndefined()
    expect(pins).toHaveLength(5)

    const byId = Object.fromEntries(pins.map((p) => [p.id, p]))
    // Public entity: visible.
    expect(byId['pin-public'].entityImageUrl).toBe('/img/hero.webp')
    expect(byId['pin-public'].entityType).toBe('character')
    // Private entity owned by someone else: pin present, entity fields stripped -- never omit
    // the pin (design.md D3).
    expect(byId['pin-private']).toBeDefined()
    expect(byId['pin-private'].entityImageUrl).toBeNull()
    expect(byId['pin-private'].entityType).toBeNull()
    // dm_only entity: a player's role level doesn't clear it.
    expect(byId['pin-dm-entity'].entityImageUrl).toBeNull()
    expect(byId['pin-dm-entity'].entityType).toBeNull()
    // No linked entity at all: both null, pin still present.
    expect(byId['pin-no-entity'].entityId).toBeNull()
    expect(byId['pin-no-entity'].entityImageUrl).toBeNull()
    expect(byId['pin-no-entity'].entityType).toBeNull()
    // Entity with no image: type still surfaces (tier 2 fallback icon), image stays null.
    expect(byId['pin-no-image'].entityImageUrl).toBeNull()
    expect(byId['pin-no-image'].entityType).toBe('location')
  })

  it("the private entity's own creator DOES see it through the join", () => {
    const pins = getPinsWithEntity(testDb.db, 'map-1', 'player', 'user-owner')
    const pin = pins.find((p) => p.id === 'pin-private')!
    expect(pin.entityImageUrl).toBe('/img/secret.webp')
  })

  it('getPinWithEntity returns the same shape as getPinsWithEntity for one pin (design.md D1)', () => {
    const single = getPinWithEntity(testDb.db, 'pin-public', 'player', 'user-player')
    const fromList = getPinsWithEntity(testDb.db, 'map-1', 'player', 'user-player').find(
      (p) => p.id === 'pin-public',
    )
    expect(single).toEqual(fromList)
  })

  it('getPinWithEntity returns undefined for a nonexistent pin id', () => {
    expect(getPinWithEntity(testDb.db, 'nonexistent', 'dm', 'user-owner')).toBeUndefined()
  })
})
