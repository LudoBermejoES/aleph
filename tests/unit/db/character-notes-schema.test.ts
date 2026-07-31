import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createTestDb, type TestDb } from '../../helpers/db'
import { characters, characterNotes } from '../../../server/db/schema/characters'
import { entities } from '../../../server/db/schema/entities'
import { campaigns } from '../../../server/db/schema/campaigns'
import { user } from '../../../server/db/schema/auth'
import { eq } from 'drizzle-orm'
import { randomUUID } from 'crypto'

type Db = ReturnType<typeof createTestDb>['db']

function seedUser(db: Db, now: Date, name: string) {
  const userId = randomUUID()
  db.insert(user)
    .values({
      id: userId,
      name,
      email: `${name}-${userId}@test.com`,
      emailVerified: false,
      createdAt: now,
      updatedAt: now,
    })
    .run()
  return userId
}

function seedCharacter(db: Db, campaignId: string, userId: string, now: Date) {
  const entityId = randomUUID()
  db.insert(entities)
    .values({
      id: entityId,
      campaignId,
      type: 'character',
      name: 'Oda Weinreich',
      slug: `oda-${entityId}`,
      filePath: `/c/oda-${entityId}.md`,
      visibility: 'members',
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    })
    .run()
  const characterId = randomUUID()
  db.insert(characters).values({ id: characterId, entityId, characterType: 'npc' }).run()
  return { entityId, characterId }
}

function addNote(db: Db, characterId: string, authorUserId: string, body: string, now: Date) {
  const id = randomUUID()
  db.insert(characterNotes)
    .values({ id, characterId, authorUserId, body, createdAt: now, updatedAt: now })
    .run()
  return id
}

describe('character_notes schema', () => {
  let testDb: TestDb
  let now: Date
  let dmId: string
  let campaignId: string

  beforeEach(() => {
    testDb = createTestDb()
    now = new Date()
    dmId = seedUser(testDb.db, now, 'dm')
    campaignId = randomUUID()
    testDb.db
      .insert(campaigns)
      .values({
        id: campaignId,
        name: 'Test',
        slug: `test-${campaignId}`,
        contentDir: `/c/${campaignId}`,
        createdBy: dmId,
        createdAt: now,
        updatedAt: now,
      })
      .run()
  })

  afterEach(() => {
    testDb.close()
  })

  it('the migration created the table with the expected columns', () => {
    const cols = testDb.sqlite.prepare("PRAGMA table_info('character_notes')").all() as {
      name: string
      notnull: number
    }[]
    const names = cols.map((c) => c.name).sort()
    expect(names).toEqual([
      'author_user_id',
      'body',
      'character_id',
      'created_at',
      'id',
      'updated_at',
    ])
    expect(cols.find((c) => c.name === 'character_id')!.notnull).toBe(1)
    expect(cols.find((c) => c.name === 'author_user_id')!.notnull).toBe(1)
  })

  it('UNIQUE (character_id, author_user_id) makes a second row for the same author impossible', () => {
    const { db } = testDb
    const { characterId } = seedCharacter(db, campaignId, dmId, now)
    const ana = seedUser(db, now, 'ana')

    addNote(db, characterId, ana, 'first', now)

    // A double-submit must not be able to fork the row — the DB refuses it.
    expect(() => addNote(db, characterId, ana, 'second', now)).toThrow(/UNIQUE/i)

    const rows = db
      .select()
      .from(characterNotes)
      .where(eq(characterNotes.characterId, characterId))
      .all()
    expect(rows).toHaveLength(1)
    expect(rows[0]!.body).toBe('first')
  })

  it('two different authors may both annotate the same character', () => {
    const { db } = testDb
    const { characterId } = seedCharacter(db, campaignId, dmId, now)
    const ana = seedUser(db, now, 'ana')
    const luis = seedUser(db, now, 'luis')

    addNote(db, characterId, ana, "Ana's three paragraphs", now)
    addNote(db, characterId, luis, "Luis's line", now)

    const rows = db
      .select()
      .from(characterNotes)
      .where(eq(characterNotes.characterId, characterId))
      .all()
    expect(rows).toHaveLength(2)
    // Neither write destroyed the other — this is the whole point of one row per author.
    expect(rows.find((r) => r.authorUserId === ana)!.body).toBe("Ana's three paragraphs")
    expect(rows.find((r) => r.authorUserId === luis)!.body).toBe("Luis's line")
  })

  it('the same author may annotate two different characters', () => {
    const { db } = testDb
    const a = seedCharacter(db, campaignId, dmId, now)
    const b = seedCharacter(db, campaignId, dmId, now)
    const ana = seedUser(db, now, 'ana')

    addNote(db, a.characterId, ana, 'about A', now)
    addNote(db, b.characterId, ana, 'about B', now)

    expect(db.select().from(characterNotes).all()).toHaveLength(2)
  })

  it('deleting the character cascades its notes away', () => {
    const { db } = testDb
    const { characterId } = seedCharacter(db, campaignId, dmId, now)
    const ana = seedUser(db, now, 'ana')
    const luis = seedUser(db, now, 'luis')
    addNote(db, characterId, ana, 'a', now)
    addNote(db, characterId, luis, 'b', now)
    expect(db.select().from(characterNotes).all()).toHaveLength(2)

    db.delete(characters).where(eq(characters.id, characterId)).run()

    expect(db.select().from(characterNotes).all()).toHaveLength(0)
  })

  it('deleting the ENTITY cascades through characters to its notes — the real delete path', () => {
    // The delete endpoint removes the entity, not the character row, and relies on two
    // cascade hops. This asserts the hop that the API actually exercises.
    const { db } = testDb
    const { entityId, characterId } = seedCharacter(db, campaignId, dmId, now)
    const ana = seedUser(db, now, 'ana')
    addNote(db, characterId, ana, 'a', now)

    db.delete(entities).where(eq(entities.id, entityId)).run()

    expect(db.select().from(characters).all()).toHaveLength(0)
    expect(db.select().from(characterNotes).all()).toHaveLength(0)
  })

  it('deleting a user cascades their notes away, leaving other authors intact', () => {
    // An unattributable note must never be displayed, so it must not survive its author.
    const { db } = testDb
    const a = seedCharacter(db, campaignId, dmId, now)
    const b = seedCharacter(db, campaignId, dmId, now)
    const ana = seedUser(db, now, 'ana')
    const luis = seedUser(db, now, 'luis')
    addNote(db, a.characterId, ana, 'ana on A', now)
    addNote(db, b.characterId, ana, 'ana on B', now)
    addNote(db, a.characterId, luis, 'luis on A', now)

    db.delete(user).where(eq(user.id, ana)).run()

    const rows = db.select().from(characterNotes).all()
    expect(rows).toHaveLength(1)
    expect(rows[0]!.authorUserId).toBe(luis)
  })

  it('body defaults to an empty string and both timestamps are required', () => {
    const { db } = testDb
    const { characterId } = seedCharacter(db, campaignId, dmId, now)
    const ana = seedUser(db, now, 'ana')
    const id = randomUUID()
    testDb.sqlite
      .prepare(
        'INSERT INTO character_notes (id, character_id, author_user_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
      )
      .run(id, characterId, ana, now.getTime(), now.getTime())
    const row = db.select().from(characterNotes).where(eq(characterNotes.id, id)).get()
    expect(row!.body).toBe('')

    expect(() =>
      testDb.sqlite
        .prepare('INSERT INTO character_notes (id, character_id, author_user_id) VALUES (?, ?, ?)')
        .run(randomUUID(), characterId, seedUser(db, now, 'other')),
    ).toThrow(/NOT NULL/i)
  })
})
