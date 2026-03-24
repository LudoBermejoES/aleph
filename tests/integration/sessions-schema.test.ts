import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createTestDb, type TestDb } from '../helpers/db'

describe('Session Schema', () => {
  let testDb: TestDb

  beforeEach(() => {
    testDb = createTestDb()
    const now = Date.now()
    testDb.sqlite.exec(`
      INSERT INTO user (id, name, email, email_verified, created_at, updated_at)
      VALUES ('user-1', 'DM', 'dm@test.com', 0, ${now}, ${now}),
             ('user-2', 'Player', 'player@test.com', 0, ${now}, ${now})
    `)
    testDb.sqlite.exec(`
      INSERT INTO campaigns (id, name, slug, content_dir, created_by, created_at, updated_at)
      VALUES ('camp-1', 'Test Campaign', 'test', '/content', 'user-1', ${now}, ${now})
    `)
  })

  afterEach(() => {
    testDb.close()
  })

  it('creates sessions with auto-incrementable number', () => {
    const now = Date.now()
    testDb.sqlite.exec(`
      INSERT INTO game_sessions (id, campaign_id, title, slug, session_number, status, created_at, updated_at)
      VALUES ('s1', 'camp-1', 'Session 1', 'session-1', 1, 'completed', ${now}, ${now}),
             ('s2', 'camp-1', 'Session 2', 'session-2', 2, 'planned', ${now}, ${now})
    `)

    const max = testDb.sqlite.prepare(
      "SELECT MAX(session_number) as max FROM game_sessions WHERE campaign_id = 'camp-1'"
    ).get() as any
    expect(max.max).toBe(2)

    // Next session number should be 3
    expect(max.max + 1).toBe(3)
  })

  it('tracks session attendance', () => {
    const now = Date.now()
    testDb.sqlite.exec(`
      INSERT INTO game_sessions (id, campaign_id, title, slug, session_number, status, created_at, updated_at)
      VALUES ('s1', 'camp-1', 'Session 1', 'session-1', 1, 'planned', ${now}, ${now})
    `)
    testDb.sqlite.exec(`
      INSERT INTO session_attendance (id, session_id, user_id, rsvp_status, attended)
      VALUES ('a1', 's1', 'user-2', 'accepted', 0)
    `)

    const attendance = testDb.sqlite.prepare(
      "SELECT * FROM session_attendance WHERE session_id = 's1'"
    ).all() as any[]
    expect(attendance).toHaveLength(1)
    expect(attendance[0].rsvp_status).toBe('accepted')
    expect(attendance[0].attended).toBe(0)
  })

  it('creates quest with sub-quest nesting', () => {
    const now = Date.now()
    testDb.sqlite.exec(`
      INSERT INTO quests (id, campaign_id, name, slug, status, is_secret, created_at, updated_at)
      VALUES ('q1', 'camp-1', 'Find the Sword', 'find-sword', 'active', 0, ${now}, ${now})
    `)
    testDb.sqlite.exec(`
      INSERT INTO quests (id, campaign_id, name, slug, status, parent_quest_id, is_secret, created_at, updated_at)
      VALUES ('q2', 'camp-1', 'Visit the Smith', 'visit-smith', 'active', 'q1', 0, ${now}, ${now})
    `)

    const parent = testDb.sqlite.prepare("SELECT * FROM quests WHERE id = 'q1'").get() as any
    const child = testDb.sqlite.prepare("SELECT * FROM quests WHERE parent_quest_id = 'q1'").get() as any

    expect(parent.name).toBe('Find the Sword')
    expect(child.name).toBe('Visit the Smith')
    expect(child.parent_quest_id).toBe('q1')
  })

  it('quest status transition validation logic', () => {
    const validTransitions: Record<string, string[]> = {
      active: ['completed', 'failed', 'abandoned'],
      completed: [],
      failed: ['active'],
      abandoned: ['active'],
    }

    expect(validTransitions['active']).toContain('completed')
    expect(validTransitions['active']).toContain('failed')
    expect(validTransitions['completed']).not.toContain('active')
    expect(validTransitions['failed']).toContain('active')
  })

  it('secret quests are filterable', () => {
    const now = Date.now()
    testDb.sqlite.exec(`
      INSERT INTO quests (id, campaign_id, name, slug, status, is_secret, created_at, updated_at)
      VALUES ('q1', 'camp-1', 'Public Quest', 'public', 'active', 0, ${now}, ${now}),
             ('q2', 'camp-1', 'Secret Quest', 'secret', 'active', 1, ${now}, ${now})
    `)

    const all = testDb.sqlite.prepare("SELECT * FROM quests WHERE campaign_id = 'camp-1'").all() as any[]
    const visible = all.filter((q: any) => !q.is_secret)

    expect(all).toHaveLength(2)
    expect(visible).toHaveLength(1)
    expect(visible[0].name).toBe('Public Quest')
  })

  it('creates decisions with consequences', () => {
    const now = Date.now()
    testDb.sqlite.exec(`
      INSERT INTO game_sessions (id, campaign_id, title, slug, session_number, status, created_at, updated_at)
      VALUES ('s1', 'camp-1', 'Session 1', 'session-1', 1, 'active', ${now}, ${now})
    `)
    testDb.sqlite.exec(`
      INSERT INTO decisions (id, session_id, campaign_id, type, title, created_at)
      VALUES ('d1', 's1', 'camp-1', 'choice', 'Save the village or pursue the villain?', ${now})
    `)
    testDb.sqlite.exec(`
      INSERT INTO consequences (id, decision_id, description, revealed)
      VALUES ('c1', 'd1', 'The village was saved but the villain escaped', 1),
             ('c2', 'd1', 'The villain is now more powerful', 0)
    `)

    const cons = testDb.sqlite.prepare("SELECT * FROM consequences WHERE decision_id = 'd1'").all() as any[]
    expect(cons).toHaveLength(2)

    // Player sees only revealed
    const revealed = cons.filter((c: any) => c.revealed)
    expect(revealed).toHaveLength(1)
    expect(revealed[0].description).toContain('village was saved')
  })

  it('arcs contain chapters in order', () => {
    testDb.sqlite.exec(`
      INSERT INTO arcs (id, campaign_id, name, slug, sort_order, status)
      VALUES ('arc-1', 'camp-1', 'Act 1', 'act-1', 1, 'active')
    `)
    testDb.sqlite.exec(`
      INSERT INTO chapters (id, arc_id, name, slug, sort_order)
      VALUES ('ch-1', 'arc-1', 'Chapter 1', 'ch-1', 1),
             ('ch-2', 'arc-1', 'Chapter 2', 'ch-2', 2)
    `)

    const chaps = testDb.sqlite.prepare(
      "SELECT * FROM chapters WHERE arc_id = 'arc-1' ORDER BY sort_order"
    ).all() as any[]
    expect(chaps).toHaveLength(2)
    expect(chaps[0].name).toBe('Chapter 1')
    expect(chaps[1].name).toBe('Chapter 2')
  })
})
