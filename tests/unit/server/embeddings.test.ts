import { describe, it, expect, beforeAll, afterEach } from 'vitest'
import Database from 'better-sqlite3'
import {
  initVecTable,
  indexEntityEmbedding,
  removeEntityEmbedding,
  searchEntitiesSemantic,
  embedText,
  EMBEDDING_DIM,
  VEC_TABLES,
  findVectorParityGaps,
  backfillFilteredVectors,
} from '../../../server/services/embeddings'
import { initFTS5, indexEntity } from '../../../server/services/search'

// Model load (~seconds, even warm from local cache) is done once for the
// whole file rather than per test to keep the suite fast.
const MODEL_LOAD_TIMEOUT = 30_000

describe('Embeddings (sqlite-vec + multilingual-e5-small)', () => {
  let sqlite: Database.Database

  beforeAll(async () => {
    // Force the model to load once, up front, outside any per-test timeout.
    await embedText('warm up', 'query')
  }, MODEL_LOAD_TIMEOUT)

  afterEach(() => {
    sqlite.close()
  })

  function freshDb() {
    sqlite = new Database(':memory:')
    sqlite.pragma('foreign_keys = ON')
    initVecTable(sqlite)
    return sqlite
  }

  it(
    'produces a normalized vector of the expected dimensionality',
    async () => {
      freshDb()
      const vector = await embedText('un vampiro poderoso', 'passage')
      expect(vector).toHaveLength(EMBEDDING_DIM)
      const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0))
      expect(norm).toBeCloseTo(1, 1)
    },
    MODEL_LOAD_TIMEOUT,
  )

  it(
    'indexes an entity and finds it via semantic KNN search',
    async () => {
      const db = freshDb()
      await indexEntityEmbedding(
        db,
        'e1',
        'c1',
        'Strahd von Zarovich',
        'Un señor vampiro no-muerto que gobierna con puño de hierro un castillo sombrío en un valle brumoso, temido por todos los mortales de la región.',
      )

      const results = await searchEntitiesSemantic(
        db,
        'c1',
        'un noble vampiro inmortal que domina con tiranía un castillo tenebroso',
        5,
      )
      expect(results.map((r) => r.entityId)).toContain('e1')
    },
    MODEL_LOAD_TIMEOUT,
  )

  it(
    'scopes semantic search results to the requesting campaign',
    async () => {
      const db = freshDb()
      await indexEntityEmbedding(db, 'e1', 'c1', 'Strahd von Zarovich', 'Un vampiro poderoso.')
      await indexEntityEmbedding(db, 'e2', 'c2', 'Strahd von Zarovich', 'Un vampiro poderoso.')

      const results = await searchEntitiesSemantic(db, 'c1', 'un vampiro poderoso', 5)
      expect(results.map((r) => r.entityId)).toEqual(['e1'])
    },
    MODEL_LOAD_TIMEOUT,
  )

  it(
    'upserts the embedding on re-index rather than accumulating duplicates',
    async () => {
      const db = freshDb()
      await indexEntityEmbedding(db, 'e1', 'c1', 'Village of Barovia', 'A gloomy village.')
      await indexEntityEmbedding(
        db,
        'e1',
        'c1',
        'Village of Barovia',
        'A sunny meadow full of flowers.',
      )

      const row = db.prepare('SELECT COUNT(*) as count FROM entity_vec_map').get() as {
        count: number
      }
      expect(row.count).toBe(1)

      const results = await searchEntitiesSemantic(db, 'c1', 'flowers in a sunny meadow', 5)
      expect(results[0]?.entityId).toBe('e1')
    },
    MODEL_LOAD_TIMEOUT,
  )

  it('removes an entity embedding on delete', async () => {
    const db = freshDb()
    await indexEntityEmbedding(db, 'e1', 'c1', 'Strahd von Zarovich', 'Un vampiro poderoso.')

    removeEntityEmbedding(db, 'e1')

    const mapRow = db.prepare('SELECT * FROM entity_vec_map WHERE entity_id = ?').get('e1')
    expect(mapRow).toBeUndefined()

    const results = await searchEntitiesSemantic(db, 'c1', 'un vampiro poderoso', 5)
    expect(results).toHaveLength(0)
  })

  it('returns an empty array for an empty query', async () => {
    const db = freshDb()
    await indexEntityEmbedding(db, 'e1', 'c1', 'Strahd von Zarovich', 'Un vampiro poderoso.')
    const results = await searchEntitiesSemantic(db, 'c1', '   ', 5)
    expect(results).toEqual([])
  })
})

/**
 * The semantic arm was the second door to the same room. `indexEntityEmbedding` embedded
 * `name\nbody` raw, so shutting the lexical arm alone would have left a player able to pull
 * a sheet back by describing its secret in their own words — no excerpt needed, since the
 * existence of the hit is already the leak.
 *
 * These assert the SHAPE of the split rather than a distance, on purpose: the cosine cutoff
 * is documented above as numerically different on x64 CI than on the ARM this runs on, and a
 * test that pins a distance is a test that fails for the wrong reason.
 */
describe('the semantic index is split by role, like the lexical one', () => {
  const MODEL_LOAD_TIMEOUT = 30_000
  let sqlite: Database.Database

  beforeAll(async () => {
    await embedText('warm up', 'query')
  }, MODEL_LOAD_TIMEOUT)

  afterEach(() => sqlite.close())

  function freshDb() {
    sqlite = new Database(':memory:')
    initVecTable(sqlite)
    return sqlite
  }

  const vecOf = (table: string, rowid: number) =>
    Buffer.from(
      (
        sqlite.prepare(`SELECT embedding FROM ${table} WHERE rowid = ?`).get(rowid) as {
          embedding: Uint8Array
        }
      ).embedding,
    ).toString('base64')

  it(
    'embeds the stripped text into the filtered table when the body holds a secret',
    async () => {
      freshDb()
      await indexEntityEmbedding(
        sqlite,
        'e1',
        'c1',
        'Casa de los Aguirre',
        'Una mansión abandonada.\n\n:::secret{.dm}\nEl ritual exige tres sacrificios humanos antes del alba.\n:::\n',
      )
      expect(vecOf(VEC_TABLES.full, 1)).not.toBe(vecOf(VEC_TABLES.filtered, 1))
      expect(findVectorParityGaps(sqlite)).toEqual([])
    },
    MODEL_LOAD_TIMEOUT,
  )

  it(
    'reuses the one vector when there is no secret to strip — the common case costs nothing extra',
    async () => {
      freshDb()
      await indexEntityEmbedding(sqlite, 'e1', 'c1', 'Plaza Mayor', 'Una plaza con soportales.')
      expect(vecOf(VEC_TABLES.full, 1)).toBe(vecOf(VEC_TABLES.filtered, 1))
      expect(findVectorParityGaps(sqlite)).toEqual([])
    },
    MODEL_LOAD_TIMEOUT,
  )

  it(
    'never returns, to a player, an entity whose only relevance is its secret',
    async () => {
      freshDb()
      // Two sheets. The decoy has nothing to do with the query; the secret-holder matches it
      // only inside the block. A player must not be able to tell them apart.
      await indexEntityEmbedding(
        sqlite,
        'secreto',
        'c1',
        'Casa de los Aguirre',
        'Una casa vacía en las afueras del pueblo.\n\n:::secret{.dm}\nAquí se celebra cada solsticio un ritual de sacrificio humano con tres víctimas.\n:::\n',
      )
      const player = await searchEntitiesSemantic(
        sqlite,
        'c1',
        'ritual de sacrificio humano en el solsticio',
        10,
        'player',
      )
      expect(player.map((r) => r.entityId)).not.toContain('secreto')

      // ...and the Narrator, who wrote it, keeps it.
      const dm = await searchEntitiesSemantic(
        sqlite,
        'c1',
        'ritual de sacrificio humano en el solsticio',
        10,
        'dm',
      )
      expect(dm.map((r) => r.entityId)).toContain('secreto')
    },
    MODEL_LOAD_TIMEOUT,
  )

  it(
    'defaults to the filtered index when no role is passed',
    async () => {
      freshDb()
      await indexEntityEmbedding(
        sqlite,
        'e1',
        'c1',
        'Ficha',
        ':::secret{.dm}\nritual de sacrificio humano en el solsticio\n:::\n',
      )
      const results = await searchEntitiesSemantic(
        sqlite,
        'c1',
        'ritual de sacrificio humano en el solsticio',
        10,
      )
      expect(results.map((r) => r.entityId)).not.toContain('e1')
    },
    MODEL_LOAD_TIMEOUT,
  )

  it(
    'removing an entity clears both tables',
    async () => {
      freshDb()
      await indexEntityEmbedding(sqlite, 'e1', 'c1', 'Ficha', 'algo')
      removeEntityEmbedding(sqlite, 'e1')
      for (const table of Object.values(VEC_TABLES)) {
        expect((sqlite.prepare(`SELECT COUNT(*) n FROM ${table}`).get() as { n: number }).n).toBe(0)
      }
      expect(findVectorParityGaps(sqlite)).toEqual([])
    },
    MODEL_LOAD_TIMEOUT,
  )
})

/**
 * The one-time migration that gives every already-embedded entity its filtered vector.
 *
 * It had no test at all, and it was the one piece of this change that failed OPEN: when the
 * source text could not be read it took the same branch as "nothing was stripped" and copied
 * the UNFILTERED vector into the filtered table — an embedding of the secret, handed to
 * every player's semantic arm, by the very migration that exists to take it away.
 *
 * It is not a hypothetical branch. `entities.file_path` stores an absolute path from the host
 * that wrote it (`/var/www/aleph/content/...`), so on a copy of this project's own database
 * 4,507 of 4,601 entities resolve to no local file and EVERY one of them took it.
 */
describe('the filtered-vector migration fails closed', () => {
  const MODEL_LOAD_TIMEOUT = 30_000
  let sqlite: Database.Database

  const SECRET_BODY =
    'Una casa vacía en las afueras del pueblo.\n\n:::secret{.dm}\nAquí se celebra cada solsticio un ritual de sacrificio humano con tres víctimas.\n:::\n'
  const SECRET_QUERY = 'ritual de sacrificio humano en el solsticio'

  beforeAll(async () => {
    await embedText('warm up', 'query')
  }, MODEL_LOAD_TIMEOUT)

  afterEach(() => sqlite.close())

  /** An entity as it looks BEFORE the migration: a full vector, no filtered one. */
  async function preMigrationDb(body: string, { withFtsRow }: { withFtsRow: boolean }) {
    sqlite = new Database(':memory:')
    initVecTable(sqlite)
    initFTS5(sqlite)
    if (withFtsRow) indexEntity(sqlite, 'e1', 'c1', 'Casa de los Aguirre', [], [], body)
    await indexEntityEmbedding(sqlite, 'e1', 'c1', 'Casa de los Aguirre', body)
    sqlite.exec(`DELETE FROM ${VEC_TABLES.filtered}`)
    return sqlite
  }

  const filteredCount = () =>
    (sqlite.prepare(`SELECT COUNT(*) n FROM ${VEC_TABLES.filtered}`).get() as { n: number }).n

  it(
    'leaves an entity OUT rather than copying its unfiltered vector when no source text can be found',
    async () => {
      await preMigrationDb(SECRET_BODY, { withFtsRow: false })

      const result = await backfillFilteredVectors(sqlite, async () => null)

      expect(result).toEqual({ copied: 0, reEmbedded: 0, skipped: 1, failed: 0 })
      expect(filteredCount()).toBe(0)
      // The property that matters, stated as the player experiences it.
      const player = await searchEntitiesSemantic(sqlite, 'c1', SECRET_QUERY, 10, 'player')
      expect(player.map((r) => r.entityId)).not.toContain('e1')
      // And it stays outstanding, so a later boot retries instead of calling it done.
      expect(findVectorParityGaps(sqlite).length).toBeGreaterThan(0)
    },
    MODEL_LOAD_TIMEOUT,
  )

  it(
    'recovers the filtered text from the lexical index, without touching the filesystem',
    async () => {
      await preMigrationDb(SECRET_BODY, { withFtsRow: true })

      const result = await backfillFilteredVectors(sqlite, async () => {
        throw new Error('the filesystem must not be consulted when the index holds the text')
      })

      expect(result).toEqual({ copied: 0, reEmbedded: 1, skipped: 0, failed: 0 })
      expect(findVectorParityGaps(sqlite)).toEqual([])
      const player = await searchEntitiesSemantic(sqlite, 'c1', SECRET_QUERY, 10, 'player')
      expect(player.map((r) => r.entityId)).not.toContain('e1')
      const dm = await searchEntitiesSemantic(sqlite, 'c1', SECRET_QUERY, 10, 'dm')
      expect(dm.map((r) => r.entityId)).toContain('e1')
    },
    MODEL_LOAD_TIMEOUT,
  )

  it(
    'copies the blob unchanged for a body with nothing to strip — the common case, and exact',
    async () => {
      await preMigrationDb('Una plaza con soportales y un mercado los martes.', {
        withFtsRow: true,
      })
      const before = Buffer.from(
        (
          sqlite.prepare(`SELECT embedding FROM ${VEC_TABLES.full} WHERE rowid = 1`).get() as {
            embedding: Uint8Array
          }
        ).embedding,
      ).toString('base64')

      const result = await backfillFilteredVectors(sqlite, async () => null)

      expect(result).toEqual({ copied: 1, reEmbedded: 0, skipped: 0, failed: 0 })
      const after = Buffer.from(
        (
          sqlite.prepare(`SELECT embedding FROM ${VEC_TABLES.filtered} WHERE rowid = 1`).get() as {
            embedding: Uint8Array
          }
        ).embedding,
      ).toString('base64')
      expect(after).toBe(before)
      expect(findVectorParityGaps(sqlite)).toEqual([])
    },
    MODEL_LOAD_TIMEOUT,
  )
})
