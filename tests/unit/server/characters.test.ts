import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createTestDb, type TestDb } from '../../helpers/db'

describe('Character Schema', () => {
  let testDb: TestDb

  beforeEach(() => {
    testDb = createTestDb()
    const now = Date.now()
    // Seed user, campaign, entity
    testDb.sqlite.exec(`
      INSERT INTO user (id, name, email, email_verified, created_at, updated_at)
      VALUES ('user-1', 'DM', 'dm@test.com', 0, ${now}, ${now})
    `)
    testDb.sqlite.exec(`
      INSERT INTO campaigns (id, name, slug, content_dir, created_by, created_at, updated_at)
      VALUES ('camp-1', 'Test', 'test', '/content', 'user-1', ${now}, ${now})
    `)
    testDb.sqlite.exec(`
      INSERT INTO entities (id, campaign_id, type, name, slug, file_path, visibility, created_by, created_at, updated_at)
      VALUES ('ent-1', 'camp-1', 'character', 'Strahd', 'strahd', '/strahd.md', 'members', 'user-1', ${now}, ${now})
    `)
  })

  afterEach(() => {
    testDb.close()
  })

  it('creates character linked to entity', () => {
    testDb.sqlite.exec(`
      INSERT INTO characters (id, entity_id, character_type, race, class, status)
      VALUES ('char-1', 'ent-1', 'npc', 'Vampire', 'Noble', 'alive')
    `)
    const char = testDb.sqlite.prepare("SELECT * FROM characters WHERE id = 'char-1'").get() as any
    expect(char.entity_id).toBe('ent-1')
    expect(char.character_type).toBe('npc')
    expect(char.race).toBe('Vampire')
  })

  it('cascades delete from entity to character', () => {
    testDb.sqlite.exec(`
      INSERT INTO characters (id, entity_id, character_type, status)
      VALUES ('char-1', 'ent-1', 'npc', 'alive')
    `)
    testDb.sqlite.exec("DELETE FROM entities WHERE id = 'ent-1'")
    const char = testDb.sqlite.prepare("SELECT * FROM characters WHERE id = 'char-1'").get()
    expect(char).toBeUndefined()
  })

  it('creates stat groups with secret definitions', () => {
    testDb.sqlite.exec(`
      INSERT INTO characters (id, entity_id, character_type, status)
      VALUES ('char-1', 'ent-1', 'npc', 'alive')
    `)
    testDb.sqlite.exec(`
      INSERT INTO stat_groups (id, campaign_id, name, player_editable, sort_order)
      VALUES ('sg-1', 'camp-1', 'Combat', 0, 1)
    `)
    testDb.sqlite.exec(`
      INSERT INTO stat_definitions (id, stat_group_id, name, key, value_type, is_secret, sort_order)
      VALUES ('sd-1', 'sg-1', 'HP', 'hp', 'number', 0, 1),
             ('sd-2', 'sg-1', 'Secret Weakness', 'weakness', 'text', 1, 2)
    `)
    testDb.sqlite.exec(`
      INSERT INTO character_stats (id, character_id, stat_definition_id, value)
      VALUES ('cs-1', 'char-1', 'sd-1', '144'),
             ('cs-2', 'char-1', 'sd-2', 'Sunlight')
    `)

    const allStats = testDb.sqlite.prepare(`
      SELECT cs.value, sd.name, sd.is_secret
      FROM character_stats cs
      JOIN stat_definitions sd ON cs.stat_definition_id = sd.id
      WHERE cs.character_id = 'char-1'
    `).all() as any[]

    expect(allStats).toHaveLength(2)

    // Simulate secret stripping for player
    const playerStats = allStats.filter(s => !s.is_secret)
    expect(playerStats).toHaveLength(1)
    expect(playerStats[0].name).toBe('HP')

    // DM sees all
    expect(allStats).toHaveLength(2)
  })

  it('creates abilities with secret flag', () => {
    testDb.sqlite.exec(`
      INSERT INTO characters (id, entity_id, character_type, status)
      VALUES ('char-1', 'ent-1', 'npc', 'alive')
    `)
    testDb.sqlite.exec(`
      INSERT INTO abilities (id, character_id, name, type, is_secret, sort_order)
      VALUES ('ab-1', 'char-1', 'Charm', 'action', 0, 1),
             ('ab-2', 'char-1', 'Dark Gift', 'trait', 1, 2)
    `)

    const all = testDb.sqlite.prepare("SELECT * FROM abilities WHERE character_id = 'char-1'").all() as any[]
    expect(all).toHaveLength(2)

    const visible = all.filter((a: any) => !a.is_secret)
    expect(visible).toHaveLength(1)
    expect(visible[0].name).toBe('Charm')
  })

  it('player_editable flag on stat groups', () => {
    testDb.sqlite.exec(`
      INSERT INTO stat_groups (id, campaign_id, name, player_editable, sort_order)
      VALUES ('sg-editable', 'camp-1', 'Player Stats', 1, 1),
             ('sg-locked', 'camp-1', 'DM Stats', 0, 2)
    `)

    const editable = testDb.sqlite.prepare("SELECT * FROM stat_groups WHERE player_editable = 1").get() as any
    const locked = testDb.sqlite.prepare("SELECT * FROM stat_groups WHERE player_editable = 0 AND id LIKE 'sg-%'").get() as any

    expect(editable.name).toBe('Player Stats')
    expect(locked.name).toBe('DM Stats')
  })
})
