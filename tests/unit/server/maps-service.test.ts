import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  filterPinsByVisibility,
  validateMapImage,
  computeBreadcrumb,
  getPinsWithEntity,
  getPinWithEntity,
  getMapPinsForEntity,
} from '../../../server/services/maps'
import { createTestDb, type TestDb } from '../../helpers/db'
import { createTestContentDir, type TestContentDir } from '../../helpers/content'

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

  it('co_dm+ sees every pin and every linked entity, including private and dm_only ones', async () => {
    const pins = await getPinsWithEntity(testDb.db, 'map-1', 'dm', 'user-player')
    expect(pins).toHaveLength(6)
    const byId = Object.fromEntries(pins.map((p) => [p.id, p]))
    expect(byId['pin-public'].entityImageUrl).toBe('/img/hero.webp')
    expect(byId['pin-private'].entityImageUrl).toBe('/img/secret.webp')
    expect(byId['pin-dm-entity'].entityImageUrl).toBe('/img/cabal.webp')
  })

  it("a player sees the pin but not a private entity's image/type unless they created it", async () => {
    const pins = await getPinsWithEntity(testDb.db, 'map-1', 'player', 'user-player')
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

  it("the private entity's own creator DOES see it through the join", async () => {
    const pins = await getPinsWithEntity(testDb.db, 'map-1', 'player', 'user-owner')
    const pin = pins.find((p) => p.id === 'pin-private')!
    expect(pin.entityImageUrl).toBe('/img/secret.webp')
  })

  it('getPinWithEntity returns the same shape as getPinsWithEntity for one pin (design.md D1)', async () => {
    const single = await getPinWithEntity(testDb.db, 'pin-public', 'player', 'user-player')
    const list = await getPinsWithEntity(testDb.db, 'map-1', 'player', 'user-player')
    const fromList = list.find((p) => p.id === 'pin-public')
    expect(single).toEqual(fromList)
  })

  it('getPinWithEntity returns undefined for a nonexistent pin id', async () => {
    expect(await getPinWithEntity(testDb.db, 'nonexistent', 'dm', 'user-owner')).toBeUndefined()
  })
})

// move-pins-and-resolve-entity-images/design.md D3: an entity's main image lives in one of
// four places depending on its type. These exercise the join against a real in-memory DB,
// one source at a time, plus the declared precedence and the fan-out guard.
describe('getPinsWithEntity: image resolution across all four sources (design.md D3)', () => {
  let testDb: TestDb
  const now = Date.now()

  beforeEach(() => {
    testDb = createTestDb()
    testDb.sqlite.exec(`
      INSERT INTO user (id, name, email, email_verified, created_at, updated_at)
      VALUES ('user-owner', 'Owner', 'owner@test.com', 0, ${now}, ${now})
    `)
    testDb.sqlite.exec(`
      INSERT INTO campaigns (id, name, slug, content_dir, created_by, created_at, updated_at)
      VALUES ('camp-1', 'Test', 'test', '/content', 'user-owner', ${now}, ${now})
    `)
    testDb.sqlite.exec(`
      INSERT INTO maps (id, campaign_id, name, slug, visibility, created_at, updated_at)
      VALUES ('map-1', 'camp-1', 'World Map', 'world-map', 'public', ${now}, ${now})
    `)
  })

  afterEach(() => {
    testDb.close()
  })

  function insertEntity(id: string, type: string, imageUrl: string | null) {
    testDb.sqlite.exec(`
      INSERT INTO entities (id, campaign_id, type, name, slug, file_path, visibility, image_url, created_by, created_at, updated_at)
      VALUES ('${id}', 'camp-1', '${type}', '${id}', '${id}', '/f-${id}', 'public', ${imageUrl ? `'${imageUrl}'` : 'NULL'}, 'user-owner', ${now}, ${now})
    `)
  }

  function insertPin(id: string, entityId: string) {
    testDb.sqlite.exec(`
      INSERT INTO map_pins (id, map_id, entity_id, label, lat, lng, visibility)
      VALUES ('${id}', 'map-1', '${entityId}', '${id}', 1, 1, 'public')
    `)
  }

  it('tier 4: a location with only entities.image_url uses it (the pre-existing, already-working path)', async () => {
    insertEntity('ent-loc', 'location', '/img/location.webp')
    insertPin('pin-loc', 'ent-loc')
    const pins = await getPinsWithEntity(testDb.db, 'map-1', 'dm', 'user-owner')
    const pin = pins.find((p) => p.id === 'pin-loc')!
    expect(pin.entityImageUrl).toBe('/img/location.webp')
  })

  it('tier 2: a character with only characters.portrait_url (no entities.image_url) uses it', async () => {
    insertEntity('ent-char', 'character', null)
    testDb.sqlite.exec(`
      INSERT INTO characters (id, entity_id, character_type, status, portrait_url)
      VALUES ('char-1', 'ent-char', 'npc', 'alive', '/img/portrait.webp')
    `)
    insertPin('pin-char', 'ent-char')
    const pins = await getPinsWithEntity(testDb.db, 'map-1', 'dm', 'user-owner')
    const pin = pins.find((p) => p.id === 'pin-char')!
    expect(pin.entityImageUrl).toBe('/img/portrait.webp')
  })

  it('tier 3: an organization with only organizations.image_url (no entities.image_url) uses it', async () => {
    insertEntity('ent-org', 'organization', null)
    testDb.sqlite.exec(`
      INSERT INTO organizations (id, campaign_id, entity_id, name, slug, image_url, created_at, updated_at)
      VALUES ('org-1', 'camp-1', 'ent-org', 'The Cabal', 'the-cabal', '/img/org.webp', ${now}, ${now})
    `)
    insertPin('pin-org', 'ent-org')
    const pins = await getPinsWithEntity(testDb.db, 'map-1', 'dm', 'user-owner')
    const pin = pins.find((p) => p.id === 'pin-org')!
    expect(pin.entityImageUrl).toBe('/img/org.webp')
  })

  it('tier 1: the entity_images primary row wins over everything else, including entities.image_url', async () => {
    insertEntity('ent-gallery', 'location', '/img/legacy.webp')
    testDb.sqlite.exec(`
      INSERT INTO entity_images (id, campaign_id, entity_id, filename, url, sort_order, is_primary, created_by, created_at)
      VALUES
        ('img-other', 'camp-1', 'ent-gallery', 'other.webp', '/gallery/other.webp', 0, 0, 'user-owner', ${now}),
        ('img-primary', 'camp-1', 'ent-gallery', 'primary.webp', '/gallery/primary.webp', 1, 1, 'user-owner', ${now})
    `)
    insertPin('pin-gallery', 'ent-gallery')
    const pins = await getPinsWithEntity(testDb.db, 'map-1', 'dm', 'user-owner')
    const pin = pins.find((p) => p.id === 'pin-gallery')!
    expect(pin.entityImageUrl).toBe('/gallery/primary.webp')
  })

  it('a pin whose entity has several gallery images still appears exactly once (fan-out guard)', async () => {
    insertEntity('ent-many', 'location', null)
    testDb.sqlite.exec(`
      INSERT INTO entity_images (id, campaign_id, entity_id, filename, url, sort_order, is_primary, created_by, created_at)
      VALUES
        ('img-1', 'camp-1', 'ent-many', 'a.webp', '/gallery/a.webp', 0, 0, 'user-owner', ${now}),
        ('img-2', 'camp-1', 'ent-many', 'b.webp', '/gallery/b.webp', 1, 1, 'user-owner', ${now}),
        ('img-3', 'camp-1', 'ent-many', 'c.webp', '/gallery/c.webp', 2, 0, 'user-owner', ${now}),
        ('img-4', 'camp-1', 'ent-many', 'd.webp', '/gallery/d.webp', 3, 0, 'user-owner', ${now})
    `)
    insertPin('pin-many', 'ent-many')
    const pins = await getPinsWithEntity(testDb.db, 'map-1', 'dm', 'user-owner')
    const all = pins.filter((p) => p.id === 'pin-many')
    expect(all).toHaveLength(1)
    expect(all[0].entityImageUrl).toBe('/gallery/b.webp')
  })
})

// add-pin-popup-entity-preview/design.md: `entityExcerpt` per entity type, with the ordering
// rule the owner made non-negotiable -- secret stripping happens BEFORE excerpting, never
// after. Uses REAL files on disk (via `createTestContentDir`), not simulated content, because
// the ordering bug this guards against is specifically about how a truncated excerpt
// interacts with `stripSecretBlocks`'s own regex.
describe('getPinsWithEntity: entityExcerpt (add-pin-popup-entity-preview)', () => {
  let testDb: TestDb
  let contentDir: TestContentDir
  const now = Date.now()

  // Long enough that a NAIVE "excerpt first, strip second" implementation truncates to 200
  // chars entirely INSIDE the secret block, before its closing `:::` -- at which point
  // `stripSecretBlocks`'s regex (which requires the closing fence in the same string) cannot
  // match at all, and the secret text would survive untouched in the excerpt. That is the
  // exact defect this test exists to catch; the correct order (strip the FULL file, then
  // excerpt) never has this problem because the closing `:::` is always present pre-truncation.
  const secretBody =
    'El dueño real es un infiltrado Nosferatu que vigila la cola de entrada. '.repeat(4)
  const publicParagraph =
    'Berghain es un club de techno berlinés con una puerta legendaria y un ambiente industrial oscuro.'
  const secretFirstMarkdown = `:::secret{.dm}\n${secretBody}\n:::\n\n${publicParagraph}`

  beforeEach(() => {
    testDb = createTestDb()
    contentDir = createTestContentDir()
    testDb.sqlite.exec(`
      INSERT INTO user (id, name, email, email_verified, created_at, updated_at)
      VALUES ('user-owner', 'Owner', 'owner@test.com', 0, ${now}, ${now})
    `)
    testDb.sqlite.exec(`
      INSERT INTO campaigns (id, name, slug, content_dir, created_by, created_at, updated_at)
      VALUES ('camp-1', 'Test', 'test', '${contentDir.root}', 'user-owner', ${now}, ${now})
    `)
    testDb.sqlite.exec(`
      INSERT INTO maps (id, campaign_id, name, slug, visibility, created_at, updated_at)
      VALUES ('map-1', 'camp-1', 'World Map', 'world-map', 'public', ${now}, ${now})
    `)
  })

  afterEach(() => {
    testDb.close()
    contentDir.cleanup()
  })

  it("a location whose FIRST paragraph is secret never leaks it to a player's excerpt, and shows the public text that follows", async () => {
    const filePath = contentDir.writeFile('location-berghain.md', secretFirstMarkdown)
    testDb.sqlite.exec(`
      INSERT INTO entities (id, campaign_id, type, name, slug, file_path, visibility, created_by, created_at, updated_at)
      VALUES ('ent-berghain', 'camp-1', 'location', 'Berghain', 'berghain', '${filePath}', 'public', 'user-owner', ${now}, ${now})
    `)
    testDb.sqlite.exec(`
      INSERT INTO map_pins (id, map_id, entity_id, label, lat, lng, visibility)
      VALUES ('pin-berghain', 'map-1', 'ent-berghain', 'Berghain', 1, 1, 'public')
    `)

    const pins = await getPinsWithEntity(testDb.db, 'map-1', 'player', 'user-owner')
    const pin = pins.find((p) => p.id === 'pin-berghain')!
    expect(pin.entityExcerpt).not.toContain('infiltrado Nosferatu')
    expect(pin.entityExcerpt).toContain('Berghain es un club de techno berlinés')
  })

  it('the same location, viewed by a DM, may include the secret text', async () => {
    const filePath = contentDir.writeFile('location-berghain-dm.md', secretFirstMarkdown)
    testDb.sqlite.exec(`
      INSERT INTO entities (id, campaign_id, type, name, slug, file_path, visibility, created_by, created_at, updated_at)
      VALUES ('ent-berghain-dm', 'camp-1', 'location', 'Berghain', 'berghain-dm', '${filePath}', 'public', 'user-owner', ${now}, ${now})
    `)
    testDb.sqlite.exec(`
      INSERT INTO map_pins (id, map_id, entity_id, label, lat, lng, visibility)
      VALUES ('pin-berghain-dm', 'map-1', 'ent-berghain-dm', 'Berghain', 1, 1, 'public')
    `)

    const pins = await getPinsWithEntity(testDb.db, 'map-1', 'dm', 'user-owner')
    const pin = pins.find((p) => p.id === 'pin-berghain-dm')!
    expect(pin.entityExcerpt).toContain('infiltrado Nosferatu')
  })

  it('a character gets the same ordering guarantee as a location, via the same code path', async () => {
    const filePath = contentDir.writeFile('character-npc.md', secretFirstMarkdown)
    testDb.sqlite.exec(`
      INSERT INTO entities (id, campaign_id, type, name, slug, file_path, visibility, created_by, created_at, updated_at)
      VALUES ('ent-npc', 'camp-1', 'character', 'NPC', 'npc', '${filePath}', 'public', 'user-owner', ${now}, ${now})
    `)
    testDb.sqlite.exec(`
      INSERT INTO map_pins (id, map_id, entity_id, label, lat, lng, visibility)
      VALUES ('pin-npc', 'map-1', 'ent-npc', 'NPC', 1, 1, 'public')
    `)

    const playerPins = await getPinsWithEntity(testDb.db, 'map-1', 'player', 'user-owner')
    const playerPin = playerPins.find((p) => p.id === 'pin-npc')!
    expect(playerPin.entityExcerpt).not.toContain('infiltrado Nosferatu')
    expect(playerPin.entityExcerpt).toContain('Berghain es un club de techno berlinés')

    const dmPins = await getPinsWithEntity(testDb.db, 'map-1', 'dm', 'user-owner')
    const dmPin = dmPins.find((p) => p.id === 'pin-npc')!
    expect(dmPin.entityExcerpt).toContain('infiltrado Nosferatu')
  })

  it('an organization excerpt comes from its description column, unstripped, and respects entity visibility', async () => {
    testDb.sqlite.exec(`
      INSERT INTO entities (id, campaign_id, type, name, slug, file_path, visibility, created_by, created_at, updated_at) VALUES
        ('ent-org-visible', 'camp-1', 'organization', 'The Cabal', 'the-cabal', '', 'public', 'user-owner', ${now}, ${now}),
        ('ent-org-hidden', 'camp-1', 'organization', 'The Hidden Cabal', 'hidden-cabal', '', 'dm_only', 'user-owner', ${now}, ${now})
    `)
    testDb.sqlite.exec(`
      INSERT INTO organizations (id, campaign_id, entity_id, name, slug, description, created_at, updated_at) VALUES
        ('org-visible', 'camp-1', 'ent-org-visible', 'The Cabal', 'the-cabal', 'Una hermandad de coleccionistas de arte con vínculos oscuros.', ${now}, ${now}),
        ('org-hidden', 'camp-1', 'ent-org-hidden', 'The Hidden Cabal', 'hidden-cabal', ':::secret{...} literal text, not a real secret block for this column', ${now}, ${now})
    `)
    testDb.sqlite.exec(`
      INSERT INTO map_pins (id, map_id, entity_id, label, lat, lng, visibility) VALUES
        ('pin-org-visible', 'map-1', 'ent-org-visible', 'The Cabal', 1, 1, 'public'),
        ('pin-org-hidden', 'map-1', 'ent-org-hidden', 'The Hidden Cabal', 2, 2, 'public')
    `)

    const pins = await getPinsWithEntity(testDb.db, 'map-1', 'player', 'user-owner')
    const byId = Object.fromEntries(pins.map((p) => [p.id, p]))

    expect(byId['pin-org-visible'].entityExcerpt).toBe(
      'Una hermandad de coleccionistas de arte con vínculos oscuros.',
    )
    // Not gated by stripSecretBlocks: the literal ":::secret{...}" text in a HIDDEN org's
    // description is irrelevant here -- what matters is that a player cannot see this
    // dm_only organization AT ALL, so its excerpt is null exactly like its image/type already are.
    expect(byId['pin-org-hidden'].entityExcerpt).toBeNull()
    expect(byId['pin-org-hidden'].entityType).toBeNull()
  })

  it('a DM viewing the same hidden organization gets its excerpt unstripped, literal secret-like text included', async () => {
    testDb.sqlite.exec(`
      INSERT INTO entities (id, campaign_id, type, name, slug, file_path, visibility, created_by, created_at, updated_at)
      VALUES ('ent-org-hidden2', 'camp-1', 'organization', 'The Hidden Cabal', 'hidden-cabal-2', '', 'dm_only', 'user-owner', ${now}, ${now})
    `)
    testDb.sqlite.exec(`
      INSERT INTO organizations (id, campaign_id, entity_id, name, slug, description, created_at, updated_at)
      VALUES ('org-hidden2', 'camp-1', 'ent-org-hidden2', 'The Hidden Cabal', 'hidden-cabal-2', 'Texto literal ::: secret {...} sin significado especial aquí.', ${now}, ${now})
    `)
    testDb.sqlite.exec(`
      INSERT INTO map_pins (id, map_id, entity_id, label, lat, lng, visibility)
      VALUES ('pin-org-hidden2', 'map-1', 'ent-org-hidden2', 'The Hidden Cabal', 1, 1, 'public')
    `)

    const pins = await getPinsWithEntity(testDb.db, 'map-1', 'dm', 'user-owner')
    const pin = pins.find((p) => p.id === 'pin-org-hidden2')!
    expect(pin.entityExcerpt).toBe('Texto literal ::: secret {...} sin significado especial aquí.')
  })

  it('a missing markdown file degrades that one pin to entityExcerpt: null without failing the request', async () => {
    testDb.sqlite.exec(`
      INSERT INTO entities (id, campaign_id, type, name, slug, file_path, visibility, created_by, created_at, updated_at) VALUES
        ('ent-missing', 'camp-1', 'location', 'Ghost Town', 'ghost-town', '${contentDir.root}/does-not-exist.md', 'public', 'user-owner', ${now}, ${now}),
        ('ent-ok', 'camp-1', 'location', 'Fine Town', 'fine-town', '${contentDir.writeFile('fine-town.md', publicParagraph)}', 'public', 'user-owner', ${now}, ${now})
    `)
    testDb.sqlite.exec(`
      INSERT INTO map_pins (id, map_id, entity_id, label, lat, lng, visibility) VALUES
        ('pin-missing', 'map-1', 'ent-missing', 'Ghost Town', 1, 1, 'public'),
        ('pin-ok', 'map-1', 'ent-ok', 'Fine Town', 2, 2, 'public')
    `)

    const pins = await getPinsWithEntity(testDb.db, 'map-1', 'player', 'user-owner')
    const byId = Object.fromEntries(pins.map((p) => [p.id, p]))
    expect(byId['pin-missing'].entityExcerpt).toBeNull()
    expect(byId['pin-ok'].entityExcerpt).toBe(publicParagraph)
  })

  it('two pins linked to the SAME entity both resolve the correct excerpt (dedup cache correctness)', async () => {
    const filePath = contentDir.writeFile('shared-location.md', publicParagraph)
    testDb.sqlite.exec(`
      INSERT INTO entities (id, campaign_id, type, name, slug, file_path, visibility, created_by, created_at, updated_at)
      VALUES ('ent-shared', 'camp-1', 'location', 'Shared Spot', 'shared-spot', '${filePath}', 'public', 'user-owner', ${now}, ${now})
    `)
    testDb.sqlite.exec(`
      INSERT INTO map_pins (id, map_id, entity_id, label, lat, lng, visibility) VALUES
        ('pin-shared-a', 'map-1', 'ent-shared', 'Shared Spot A', 1, 1, 'public'),
        ('pin-shared-b', 'map-1', 'ent-shared', 'Shared Spot B', 2, 2, 'public')
    `)

    const pins = await getPinsWithEntity(testDb.db, 'map-1', 'player', 'user-owner')
    const byId = Object.fromEntries(pins.map((p) => [p.id, p]))
    expect(byId['pin-shared-a'].entityExcerpt).toBe(publicParagraph)
    expect(byId['pin-shared-b'].entityExcerpt).toBe(publicParagraph)
  })

  it('an entity type with no established text source gets entityExcerpt: null', async () => {
    testDb.sqlite.exec(`
      INSERT INTO entities (id, campaign_id, type, name, slug, file_path, visibility, created_by, created_at, updated_at)
      VALUES ('ent-item', 'camp-1', 'item', 'A Sword', 'a-sword', '', 'public', 'user-owner', ${now}, ${now})
    `)
    testDb.sqlite.exec(`
      INSERT INTO map_pins (id, map_id, entity_id, label, lat, lng, visibility)
      VALUES ('pin-item', 'map-1', 'ent-item', 'A Sword', 1, 1, 'public')
    `)

    const pins = await getPinsWithEntity(testDb.db, 'map-1', 'dm', 'user-owner')
    const pin = pins.find((p) => p.id === 'pin-item')!
    expect(pin.entityExcerpt).toBeNull()
  })

  it('getPinWithEntity resolves the same excerpt as getPinsWithEntity for one pin', async () => {
    const filePath = contentDir.writeFile('single-pin-location.md', publicParagraph)
    testDb.sqlite.exec(`
      INSERT INTO entities (id, campaign_id, type, name, slug, file_path, visibility, created_by, created_at, updated_at)
      VALUES ('ent-single', 'camp-1', 'location', 'Single', 'single', '${filePath}', 'public', 'user-owner', ${now}, ${now})
    `)
    testDb.sqlite.exec(`
      INSERT INTO map_pins (id, map_id, entity_id, label, lat, lng, visibility)
      VALUES ('pin-single', 'map-1', 'ent-single', 'Single', 1, 1, 'public')
    `)

    const single = await getPinWithEntity(testDb.db, 'pin-single', 'player', 'user-owner')
    expect(single?.entityExcerpt).toBe(publicParagraph)
  })
})

// show-entity-map-pins/design.md D1/D2: the reverse of getPinsWithEntity -- entityId -> its
// placements across every map, filtered by the viewer's access to the MAP (not the entity,
// which the caller already sees by construction: they're on its own detail page).
describe('getMapPinsForEntity (show-entity-map-pins/design.md D1/D2)', () => {
  let testDb: TestDb
  const now = Date.now()

  beforeEach(() => {
    testDb = createTestDb()
    testDb.sqlite.exec(`
      INSERT INTO user (id, name, email, email_verified, created_at, updated_at)
      VALUES ('user-owner', 'Owner', 'owner@test.com', 0, ${now}, ${now})
    `)
    testDb.sqlite.exec(`
      INSERT INTO campaigns (id, name, slug, content_dir, created_by, created_at, updated_at)
      VALUES ('camp-1', 'Test', 'test', '/content', 'user-owner', ${now}, ${now})
    `)
    testDb.sqlite.exec(`
      INSERT INTO entities (id, campaign_id, type, name, slug, file_path, visibility, created_by, created_at, updated_at)
      VALUES ('ent-1', 'camp-1', 'location', 'Berghain', 'berghain', '/f1', 'public', 'user-owner', ${now}, ${now})
    `)
  })

  afterEach(() => {
    testDb.close()
  })

  it('returns a LIST even for a single placement, with the map name/slug and the pin id/label/coords', () => {
    testDb.sqlite.exec(`
      INSERT INTO maps (id, campaign_id, name, slug, visibility, created_at, updated_at)
      VALUES ('map-1', 'camp-1', 'Berlin', 'berlin', 'public', ${now}, ${now})
    `)
    testDb.sqlite.exec(`
      INSERT INTO map_pins (id, map_id, entity_id, label, lat, lng, visibility)
      VALUES ('pin-1', 'map-1', 'ent-1', NULL, 12.5, 34.5, 'public')
    `)

    const placements = getMapPinsForEntity(testDb.db, 'ent-1', 'player')
    expect(placements).toEqual([
      {
        pinId: 'pin-1',
        mapId: 'map-1',
        mapName: 'Berlin',
        mapSlug: 'berlin',
        label: null,
        lat: 12.5,
        lng: 34.5,
      },
    ])
  })

  it('an entity pinned twice on the SAME map returns both placements', () => {
    testDb.sqlite.exec(`
      INSERT INTO maps (id, campaign_id, name, slug, visibility, created_at, updated_at)
      VALUES ('map-1', 'camp-1', 'Berlin', 'berlin', 'public', ${now}, ${now})
    `)
    testDb.sqlite.exec(`
      INSERT INTO map_pins (id, map_id, entity_id, label, lat, lng, visibility) VALUES
        ('pin-1', 'map-1', 'ent-1', 'Front entrance', 1, 1, 'public'),
        ('pin-2', 'map-1', 'ent-1', 'Back entrance', 2, 2, 'public')
    `)

    const placements = getMapPinsForEntity(testDb.db, 'ent-1', 'player')
    expect(placements).toHaveLength(2)
    expect(placements.map((p) => p.pinId).sort()).toEqual(['pin-1', 'pin-2'])
  })

  it('an entity has no placements at all returns an empty list', () => {
    expect(getMapPinsForEntity(testDb.db, 'ent-1', 'player')).toEqual([])
  })

  // Task 2.3: two maps, one visible and one not, for the same entity.
  it('omits a placement on a map the viewer may not see, keeping the one they may (task 2.3)', () => {
    testDb.sqlite.exec(`
      INSERT INTO maps (id, campaign_id, name, slug, visibility, created_at, updated_at) VALUES
        ('map-visible', 'camp-1', 'Public Map', 'public-map', 'public', ${now}, ${now}),
        ('map-hidden', 'camp-1', 'Secret War Room', 'secret-war-room', 'dm_only', ${now}, ${now})
    `)
    testDb.sqlite.exec(`
      INSERT INTO map_pins (id, map_id, entity_id, label, lat, lng, visibility) VALUES
        ('pin-visible', 'map-visible', 'ent-1', NULL, 1, 1, 'public'),
        ('pin-hidden', 'map-hidden', 'ent-1', NULL, 2, 2, 'public')
    `)

    const placements = getMapPinsForEntity(testDb.db, 'ent-1', 'player')
    expect(placements).toHaveLength(1)
    expect(placements[0].pinId).toBe('pin-visible')
    // Never a blanked/null slug for the hidden one -- it must be OMITTED, not disclosed.
    expect(placements.find((p) => p.mapSlug === null)).toBeUndefined()
  })

  it('a co_dm+ sees a placement on a dm_only map', () => {
    testDb.sqlite.exec(`
      INSERT INTO maps (id, campaign_id, name, slug, visibility, created_at, updated_at)
      VALUES ('map-hidden', 'camp-1', 'Secret War Room', 'secret-war-room', 'dm_only', ${now}, ${now})
    `)
    testDb.sqlite.exec(`
      INSERT INTO map_pins (id, map_id, entity_id, label, lat, lng, visibility)
      VALUES ('pin-hidden', 'map-hidden', 'ent-1', NULL, 2, 2, 'public')
    `)

    expect(getMapPinsForEntity(testDb.db, 'ent-1', 'co_dm')).toHaveLength(1)
    expect(getMapPinsForEntity(testDb.db, 'ent-1', 'dm')).toHaveLength(1)
  })

  it('a placement whose PIN itself is dm_only-visible is omitted for a lower role even on a public map', () => {
    testDb.sqlite.exec(`
      INSERT INTO maps (id, campaign_id, name, slug, visibility, created_at, updated_at)
      VALUES ('map-1', 'camp-1', 'Berlin', 'berlin', 'public', ${now}, ${now})
    `)
    testDb.sqlite.exec(`
      INSERT INTO map_pins (id, map_id, entity_id, label, lat, lng, visibility)
      VALUES ('pin-secret', 'map-1', 'ent-1', NULL, 1, 1, 'dm_only')
    `)

    expect(getMapPinsForEntity(testDb.db, 'ent-1', 'player')).toEqual([])
    expect(getMapPinsForEntity(testDb.db, 'ent-1', 'dm')).toHaveLength(1)
  })

  it("does not return another entity's placements", () => {
    testDb.sqlite.exec(`
      INSERT INTO entities (id, campaign_id, type, name, slug, file_path, visibility, created_by, created_at, updated_at)
      VALUES ('ent-other', 'camp-1', 'location', 'Other Place', 'other-place', '/f2', 'public', 'user-owner', ${now}, ${now})
    `)
    testDb.sqlite.exec(`
      INSERT INTO maps (id, campaign_id, name, slug, visibility, created_at, updated_at)
      VALUES ('map-1', 'camp-1', 'Berlin', 'berlin', 'public', ${now}, ${now})
    `)
    testDb.sqlite.exec(`
      INSERT INTO map_pins (id, map_id, entity_id, label, lat, lng, visibility)
      VALUES ('pin-other', 'map-1', 'ent-other', NULL, 1, 1, 'public')
    `)

    expect(getMapPinsForEntity(testDb.db, 'ent-1', 'player')).toEqual([])
  })
})
