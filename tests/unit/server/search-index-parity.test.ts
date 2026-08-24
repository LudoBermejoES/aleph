import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import Database from 'better-sqlite3'
import {
  initFTS5,
  indexEntity,
  removeEntityFromIndex,
  findIndexParityGaps,
  assertIndexParity,
  searchEntities,
  repairIndexParity,
  FTS_TABLES,
} from '../../../server/services/search'

/**
 * Two indices that must agree about the same content are two copies maintained by hand,
 * and this project has been burned by that more than once — a version constant that fell
 * out of step six times, an Arcanoi budget written in two places whose own code admitted it
 * "mirrors the other one-for-one".
 *
 * So the split is only acceptable if divergence is caught rather than trusted not to happen.
 * The structural half is in `indexEntity`: one derivation, one transaction, one shared
 * rowid, no per-variant entry point. This is the other half — the guard that fails when the
 * two disagree about WHICH entities they hold.
 *
 * The last case here is the important one: it BREAKS the invariant on purpose and requires
 * the guard to notice. A parity guard that has never been shown failing is not a guard.
 */
describe('the two copies of the lexical index cannot drift apart', () => {
  let sqlite: Database.Database

  beforeEach(() => {
    sqlite = new Database(':memory:')
    initFTS5(sqlite)
  })
  afterEach(() => sqlite.close())

  const rowids = (table: string) =>
    (
      sqlite.prepare(`SELECT rowid FROM ${table} ORDER BY rowid`).all() as Array<{ rowid: number }>
    ).map((r) => r.rowid)

  it('holds the same entities after a long mixed run of writes', () => {
    for (let i = 0; i < 25; i++) {
      indexEntity(
        sqlite,
        `e${i}`,
        `c${i % 3}`,
        `Ficha ${i}`,
        [`alias${i}`],
        ['tag'],
        `Cuerpo ${i}.`,
      )
    }
    for (let i = 0; i < 25; i += 3) {
      indexEntity(
        sqlite,
        `e${i}`,
        `c${i % 3}`,
        `Ficha ${i} v2`,
        [],
        [],
        `:::secret{.dm}\noculto ${i}\n:::\n`,
      )
    }
    for (let i = 1; i < 25; i += 7) removeEntityFromIndex(sqlite, `e${i}`)
    indexEntity(sqlite, 'e1', 'c1', 'Vuelve', [], [], 'Reindexada tras borrarla.')

    expect(findIndexParityGaps(sqlite)).toEqual([])
    expect(rowids(FTS_TABLES.full)).toEqual(rowids(FTS_TABLES.filtered))
    expect(rowids(FTS_TABLES.full)).toHaveLength(
      (sqlite.prepare('SELECT COUNT(*) n FROM entities_fts_map').get() as { n: number }).n,
    )
  })

  it('re-indexing the same entity leaves exactly one row in each copy', () => {
    for (let i = 0; i < 5; i++) indexEntity(sqlite, 'e1', 'c1', 'Ficha', [], [], `version ${i}`)
    for (const table of Object.values(FTS_TABLES)) {
      expect((sqlite.prepare(`SELECT COUNT(*) n FROM ${table}`).get() as { n: number }).n).toBe(1)
    }
    expect(findIndexParityGaps(sqlite)).toEqual([])
  })

  it('removing an entity removes it from both copies, not just one', () => {
    indexEntity(sqlite, 'e1', 'c1', 'Ficha', [], [], 'algo')
    removeEntityFromIndex(sqlite, 'e1')
    for (const table of Object.values(FTS_TABLES)) expect(rowids(table)).toEqual([])
    expect(findIndexParityGaps(sqlite)).toEqual([])
  })

  it('FAILS when one copy holds an entity the other does not', () => {
    indexEntity(sqlite, 'e1', 'c1', 'Ficha', [], [], 'algo')
    indexEntity(sqlite, 'e2', 'c1', 'Otra', [], [], 'otra cosa')
    expect(findIndexParityGaps(sqlite)).toEqual([])

    // Exactly the drift the design is meant to make impossible, forced by hand.
    sqlite.prepare(`DELETE FROM ${FTS_TABLES.filtered} WHERE rowid = 1`).run()

    const problems = findIndexParityGaps(sqlite)
    expect(problems).toHaveLength(1)
    expect(problems[0]).toContain(FTS_TABLES.filtered)
    expect(() => assertIndexParity(sqlite)).toThrow(/parity broken/i)
  })

  it('FAILS on an orphan row that no entity maps to', () => {
    indexEntity(sqlite, 'e1', 'c1', 'Ficha', [], [], 'algo')
    sqlite
      .prepare(
        `INSERT INTO ${FTS_TABLES.full}(rowid, name, aliases, tags, body, stems) VALUES (99,'x','','','','')`,
      )
      .run()
    expect(findIndexParityGaps(sqlite)[0]).toMatch(/no entity mapping/)
  })

  it('the filtered copy really is the stripped text, and the full copy really is not', () => {
    indexEntity(sqlite, 'e1', 'c1', 'Ficha', [], [], 'publico\n\n:::secret{.dm}\nprivado\n:::\n')
    const bodyOf = (table: string) =>
      (sqlite.prepare(`SELECT body FROM ${table} WHERE rowid = 1`).get() as { body: string }).body
    expect(bodyOf(FTS_TABLES.full)).toContain('privado')
    expect(bodyOf(FTS_TABLES.filtered)).not.toContain('privado')
    expect(bodyOf(FTS_TABLES.filtered)).toContain('publico')
  })

  it('the stem column of the filtered copy carries no stem of a secret word', () => {
    indexEntity(
      sqlite,
      'e1',
      'c1',
      'Ficha',
      [],
      [],
      ':::secret{.dm}\nlos sacrificarán al alba\n:::\n',
    )
    const stems = (table: string) =>
      (sqlite.prepare(`SELECT stems FROM ${table} WHERE rowid = 1`).get() as { stems: string })
        .stems
    expect(stems(FTS_TABLES.full)).toContain('sacrific')
    expect(stems(FTS_TABLES.filtered)).not.toContain('sacrific')
  })
})

describe('an index written by the previous schema is migrated in place', () => {
  it("rebuilds both copies from the old index's own text, without touching the filesystem", () => {
    const sqlite = new Database(':memory:')
    // The shape that shipped before this change: one table, four columns.
    sqlite.exec(`
      CREATE TABLE entities_fts_map (rowid INTEGER PRIMARY KEY AUTOINCREMENT, entity_id TEXT NOT NULL UNIQUE, campaign_id TEXT NOT NULL);
      CREATE VIRTUAL TABLE entities_fts USING fts5(name, aliases, tags, body, tokenize='porter unicode61', prefix='2 3');
      INSERT INTO entities_fts_map (entity_id, campaign_id) VALUES ('vieja', 'c1'), ('otra', 'c1');
      INSERT INTO entities_fts(rowid, name, aliases, tags, body) VALUES
        (1, 'Casa Vieja', 'Aguirre', 'mansion', 'publico\n\n:::secret{.dm}\nlos sacrificaran al alba\n:::\n'),
        (2, 'Plaza', '', '', 'una plaza con soportales');
    `)

    expect(initFTS5(sqlite)).toEqual({ migrated: 2 })

    // The map SURVIVES: emptying it would make the boot backfill re-read every entity file,
    // which on this project's own 1,495-entity database is a multi-minute blocked startup.
    expect(
      (sqlite.prepare('SELECT COUNT(*) n FROM entities_fts_map').get() as { n: number }).n,
    ).toBe(2)

    for (const table of Object.values(FTS_TABLES)) {
      expect(
        (sqlite.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>).map(
          (c) => c.name,
        ),
      ).toContain('stems')
      expect((sqlite.prepare(`SELECT COUNT(*) n FROM ${table}`).get() as { n: number }).n).toBe(2)
    }
    expect(findIndexParityGaps(sqlite)).toEqual([])

    // And the migration produced a genuinely filtered copy, not a duplicate of the old one.
    const bodyOf = (table: string) =>
      (sqlite.prepare(`SELECT body FROM ${table} WHERE rowid = 1`).get() as { body: string }).body
    expect(bodyOf(FTS_TABLES.full)).toContain('sacrificaran')
    expect(bodyOf(FTS_TABLES.filtered)).not.toContain('sacrificaran')

    // Searchable straight away, both ways round, with no backfill having run.
    expect(searchEntities(sqlite, 'c1', 'sacrificar', 20, 'dm')).toHaveLength(1)
    expect(searchEntities(sqlite, 'c1', 'sacrificar', 20, 'player')).toEqual([])
    expect(searchEntities(sqlite, 'c1', 'soportales', 20, 'player')).toHaveLength(1)

    expect(initFTS5(sqlite)).toEqual({ migrated: 0 })
    sqlite.close()
  })

  it('leaves a current index alone', () => {
    const sqlite = new Database(':memory:')
    initFTS5(sqlite)
    indexEntity(sqlite, 'e1', 'c1', 'Ficha', [], [], 'algo')
    expect(initFTS5(sqlite)).toEqual({ migrated: 0 })
    expect(
      (sqlite.prepare('SELECT COUNT(*) n FROM entities_fts_map').get() as { n: number }).n,
    ).toBe(1)
    sqlite.close()
  })

  it('a fresh database reports nothing migrated', () => {
    const sqlite = new Database(':memory:')
    expect(initFTS5(sqlite)).toEqual({ migrated: 0 })
    expect(findIndexParityGaps(sqlite)).toEqual([])
    sqlite.close()
  })
})

describe('an interrupted migration cannot leave the index half-built', () => {
  /** The shape that shipped before this change: one table, four columns. */
  const legacy = (sqlite: Database.Database) =>
    sqlite.exec(`
      CREATE TABLE entities_fts_map (rowid INTEGER PRIMARY KEY AUTOINCREMENT, entity_id TEXT NOT NULL UNIQUE, campaign_id TEXT NOT NULL);
      CREATE VIRTUAL TABLE entities_fts USING fts5(name, aliases, tags, body, tokenize='porter unicode61', prefix='2 3');
      INSERT INTO entities_fts_map (entity_id, campaign_id) VALUES ('a','c1'), ('b','c1'), ('c','c1');
      INSERT INTO entities_fts(rowid, name, aliases, tags, body) VALUES
        (1,'Uno','','','texto uno'), (2,'Dos','','','texto dos'), (3,'Tres','','','texto tres');
    `)

  it('rolls all the way back to the working old index when the refill throws', () => {
    const sqlite = new Database(':memory:')
    legacy(sqlite)

    // Force a failure partway through the refill. Anything that throws inside the
    // transaction must undo the DROP too, or the map is left pointing at nothing.
    const realPrepare = sqlite.prepare.bind(sqlite)
    let inserts = 0
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(sqlite as any).prepare = (sql: string) => {
      if (sql.includes('INSERT INTO entities_fts_filtered') && ++inserts === 2) {
        throw new Error('boom, killed mid-migration')
      }
      return realPrepare(sql)
    }

    expect(() => initFTS5(sqlite)).toThrow(/boom/)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(sqlite as any).prepare = realPrepare

    // The OLD index is intact — three rows, four columns, nothing lost.
    expect((sqlite.prepare('SELECT COUNT(*) n FROM entities_fts').get() as { n: number }).n).toBe(3)
    expect(
      (sqlite.prepare('PRAGMA table_info(entities_fts)').all() as Array<{ name: string }>).map(
        (c) => c.name,
      ),
    ).not.toContain('stems')
    expect(
      (sqlite.prepare('SELECT COUNT(*) n FROM entities_fts_map').get() as { n: number }).n,
    ).toBe(3)

    // And a later, clean run still migrates it.
    expect(initFTS5(sqlite)).toEqual({ migrated: 3 })
    expect(findIndexParityGaps(sqlite)).toEqual([])
    sqlite.close()
  })

  it('repairs a copy that lost rows the map still knows about', () => {
    const sqlite = new Database(':memory:')
    initFTS5(sqlite)
    indexEntity(sqlite, 'a', 'c1', 'Uno', [], [], 'publico\n\n:::secret{.dm}\noculto uno\n:::\n')
    indexEntity(sqlite, 'b', 'c1', 'Dos', [], [], 'texto dos')

    // Exactly the state a killed migration produced for real.
    sqlite.prepare(`DELETE FROM ${FTS_TABLES.filtered} WHERE rowid = 1`).run()
    expect(findIndexParityGaps(sqlite)).not.toEqual([])

    expect(repairIndexParity(sqlite)).toEqual({ repaired: 1, unrecoverable: [] })
    expect(findIndexParityGaps(sqlite)).toEqual([])

    // Repaired from the FULL copy, so the filtered one is genuinely re-filtered — not a
    // copy of the row that still had the secret in it.
    const filteredBody = (
      sqlite.prepare(`SELECT body FROM ${FTS_TABLES.filtered} WHERE rowid = 1`).get() as {
        body: string
      }
    ).body
    expect(filteredBody).not.toContain('oculto')
    expect(filteredBody).toContain('publico')
    expect(searchEntities(sqlite, 'c1', 'oculto', 20, 'player')).toEqual([])
    expect(searchEntities(sqlite, 'c1', 'oculto', 20, 'dm')).toHaveLength(1)
    sqlite.close()
  })

  it('reports, rather than invents, an entity missing from both copies', () => {
    const sqlite = new Database(':memory:')
    initFTS5(sqlite)
    indexEntity(sqlite, 'a', 'c1', 'Uno', [], [], 'texto uno')
    for (const table of Object.values(FTS_TABLES)) {
      sqlite.prepare(`DELETE FROM ${table} WHERE rowid = 1`).run()
    }
    expect(repairIndexParity(sqlite)).toEqual({ repaired: 0, unrecoverable: ['a'] })
    sqlite.close()
  })
})
