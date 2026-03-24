import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  filterPinsByVisibility,
  validateMapImage,
  computeBreadcrumb,
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
    expect(result.find(p => p.visibility === 'dm_only')).toBeUndefined()
  })

  it('player sees public and members pins', () => {
    const result = filterPinsByVisibility(pins, 'player')
    expect(result).toHaveLength(2)
    expect(result.map(p => p.visibility)).toEqual(['public', 'members'])
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
