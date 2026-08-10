import { describe, it, expect, beforeAll, afterEach } from 'vitest'
import Database from 'better-sqlite3'
import {
  initVecTable,
  indexEntityEmbedding,
  removeEntityEmbedding,
  searchEntitiesSemantic,
  embedText,
  EMBEDDING_DIM,
} from '../../../server/services/embeddings'

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
