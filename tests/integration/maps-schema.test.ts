import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createTestDb, type TestDb } from '../helpers/db'

describe('Map Schema Tests', () => {
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

  it('map_pins FK to entity and child_map', () => {
    const now = Date.now()
    testDb.sqlite.exec(`
      INSERT INTO entities (id, campaign_id, type, name, slug, file_path, visibility, created_by, created_at, updated_at)
      VALUES ('ent-1', 'camp-1', 'location', 'Castle', 'castle', '/castle.md', 'public', 'user-1', ${now}, ${now})
    `)
    testDb.sqlite.exec(`
      INSERT INTO maps (id, campaign_id, name, slug, visibility, created_at, updated_at)
      VALUES ('map-1', 'camp-1', 'World', 'world', 'public', ${now}, ${now}),
             ('map-2', 'camp-1', 'Castle Interior', 'castle-int', 'public', ${now}, ${now})
    `)
    // Pin with entity link
    testDb.sqlite.exec(`
      INSERT INTO map_pins (id, map_id, entity_id, label, lat, lng, visibility)
      VALUES ('pin-1', 'map-1', 'ent-1', 'Castle', 100.0, 200.0, 'public')
    `)
    // Pin with child map link
    testDb.sqlite.exec(`
      INSERT INTO map_pins (id, map_id, child_map_id, label, lat, lng, visibility)
      VALUES ('pin-2', 'map-1', 'map-2', 'Enter Castle', 100.0, 200.0, 'public')
    `)

    const pins = testDb.sqlite.prepare("SELECT * FROM map_pins WHERE map_id = 'map-1'").all() as any[]
    expect(pins).toHaveLength(2)
    expect(pins.find((p: any) => p.entity_id === 'ent-1')).toBeDefined()
    expect(pins.find((p: any) => p.child_map_id === 'map-2')).toBeDefined()
  })

  it('map_layers sort order', () => {
    const now = Date.now()
    testDb.sqlite.exec(`
      INSERT INTO maps (id, campaign_id, name, slug, visibility, created_at, updated_at)
      VALUES ('map-1', 'camp-1', 'World', 'world', 'public', ${now}, ${now})
    `)
    testDb.sqlite.exec(`
      INSERT INTO map_layers (id, map_id, name, type, opacity, sort_order, visible_default)
      VALUES ('layer-1', 'map-1', 'Base', 'standard', 1.0, 0, 1),
             ('layer-2', 'map-1', 'Political', 'overlay', 0.5, 1, 0),
             ('layer-3', 'map-1', 'Climate', 'overlay', 0.3, 2, 0)
    `)

    const layers = testDb.sqlite.prepare(
      "SELECT * FROM map_layers WHERE map_id = 'map-1' ORDER BY sort_order"
    ).all() as any[]
    expect(layers).toHaveLength(3)
    expect(layers[0].name).toBe('Base')
    expect(layers[1].name).toBe('Political')
    expect(layers[2].name).toBe('Climate')
  })

  it('map_regions stores GeoJSON as text', () => {
    const now = Date.now()
    testDb.sqlite.exec(`
      INSERT INTO maps (id, campaign_id, name, slug, visibility, created_at, updated_at)
      VALUES ('map-1', 'camp-1', 'World', 'world', 'public', ${now}, ${now})
    `)
    const geojson = JSON.stringify({
      type: 'Polygon',
      coordinates: [[[0, 0], [100, 0], [100, 100], [0, 100], [0, 0]]],
    })
    testDb.sqlite.prepare(`
      INSERT INTO map_regions (id, map_id, name, geojson, color, opacity, visibility)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run('reg-1', 'map-1', 'Barovia', geojson, '#00ff00', 0.3, 'public')

    const region = testDb.sqlite.prepare("SELECT * FROM map_regions WHERE id = 'reg-1'").get() as any
    expect(region).toBeDefined()
    const parsed = JSON.parse(region.geojson)
    expect(parsed.type).toBe('Polygon')
    expect(parsed.coordinates[0]).toHaveLength(5)
  })
})
