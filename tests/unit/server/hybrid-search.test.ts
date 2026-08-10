import { describe, it, expect, beforeAll, afterEach } from 'vitest'
import Database from 'better-sqlite3'
import { initFTS5, indexEntity } from '../../../server/services/search'
import { initVecTable, indexEntityEmbedding, embedText } from '../../../server/services/embeddings'
import {
  fuseRankedLists,
  hybridSearchEntities,
  RRF_K,
} from '../../../server/services/hybrid-search'

const MODEL_LOAD_TIMEOUT = 30_000

describe('fuseRankedLists (pure RRF)', () => {
  it('ranks an entity found by both arms above one found by only one', () => {
    const fused = fuseRankedLists([
      { arm: 'lexical', entityIds: ['a', 'b'] },
      { arm: 'semantic', entityIds: ['a', 'c'] },
    ])
    expect(fused[0].entityId).toBe('a')
    expect(fused[0].arms.sort()).toEqual(['lexical', 'semantic'])
  })

  it('includes lexical-only and semantic-only matches in the fused result', () => {
    const fused = fuseRankedLists([
      { arm: 'lexical', entityIds: ['lex-only'] },
      { arm: 'semantic', entityIds: ['sem-only'] },
    ])
    const ids = fused.map((r) => r.entityId)
    expect(ids).toContain('lex-only')
    expect(ids).toContain('sem-only')
  })

  it('scores rank 1 in a single list as 1/(k+1)', () => {
    const fused = fuseRankedLists([{ arm: 'lexical', entityIds: ['a'] }], 60)
    expect(fused[0].score).toBeCloseTo(1 / 61, 10)
  })

  it('uses the standard k=60 default', () => {
    expect(RRF_K).toBe(60)
  })

  it('returns an empty array when given no lists', () => {
    expect(fuseRankedLists([])).toEqual([])
  })
})

describe('hybridSearchEntities (integration of lexical + semantic)', () => {
  let sqlite: Database.Database

  beforeAll(async () => {
    await embedText('warm up', 'query')
  }, MODEL_LOAD_TIMEOUT)

  afterEach(() => {
    sqlite.close()
  })

  function freshDb() {
    sqlite = new Database(':memory:')
    sqlite.pragma('foreign_keys = ON')
    initFTS5(sqlite)
    initVecTable(sqlite)
    return sqlite
  }

  it(
    'exact-name queries still rank first',
    async () => {
      const db = freshDb()
      indexEntity(db, 'e1', 'c1', 'Strahd von Zarovich', [], [], 'A vampire lord.')
      await indexEntityEmbedding(db, 'e1', 'c1', 'Strahd von Zarovich', 'A vampire lord.')
      indexEntity(db, 'e2', 'c1', 'Village of Barovia', [], [], 'A gloomy village.')
      await indexEntityEmbedding(db, 'e2', 'c1', 'Village of Barovia', 'A gloomy village.')

      const { fused } = await hybridSearchEntities(db, 'c1', 'Strahd', 10)
      expect(fused[0].entityId).toBe('e1')
    },
    MODEL_LOAD_TIMEOUT,
  )

  it(
    'surfaces a semantic-only match for a query sharing no words with the content',
    async () => {
      const db = freshDb()
      indexEntity(
        db,
        'e1',
        'c1',
        'Otto von Grugger',
        [],
        [],
        'Marcó a los niños del bunker con un ritual de sacrificio, corrompiendo sus almas.',
      )
      await indexEntityEmbedding(
        db,
        'e1',
        'c1',
        'Otto von Grugger',
        'Marcó a los niños del bunker con un ritual de sacrificio, corrompiendo sus almas.',
      )

      const { fused } = await hybridSearchEntities(
        db,
        'c1',
        'niños siendo corrompidos por un ritual, sacrificio de menores',
        10,
      )
      const match = fused.find((r) => r.entityId === 'e1')
      expect(match).toBeDefined()
      expect(match?.arms).toEqual(['semantic'])
    },
    MODEL_LOAD_TIMEOUT,
  )

  it(
    'does not surface unrelated entities for a nonsense query',
    async () => {
      const db = freshDb()
      indexEntity(db, 'e1', 'c1', 'FTS Reindex NPC', [], [], 'Generic content.')
      await indexEntityEmbedding(db, 'e1', 'c1', 'FTS Reindex NPC', 'Generic content.')

      const { fused } = await hybridSearchEntities(db, 'c1', `xyzzyqwert${1}`, 10)
      expect(fused).toHaveLength(0)
    },
    MODEL_LOAD_TIMEOUT,
  )

  it(
    'falls back to lexical-only when semanticEnabled is false',
    async () => {
      const db = freshDb()
      indexEntity(db, 'e1', 'c1', 'Strahd von Zarovich', [], [], 'A vampire lord.')
      await indexEntityEmbedding(db, 'e1', 'c1', 'Strahd von Zarovich', 'A vampire lord.')

      const { fused } = await hybridSearchEntities(db, 'c1', 'Strahd', 10, {
        semanticEnabled: false,
      })
      expect(fused[0].arms).toEqual(['lexical'])
    },
    MODEL_LOAD_TIMEOUT,
  )

  it(
    'scopes hybrid results to the requesting campaign',
    async () => {
      const db = freshDb()
      indexEntity(db, 'e1', 'c1', 'Strahd von Zarovich', [], [], 'A vampire lord.')
      await indexEntityEmbedding(db, 'e1', 'c1', 'Strahd von Zarovich', 'A vampire lord.')
      indexEntity(db, 'e2', 'c2', 'Strahd von Zarovich', [], [], 'A vampire lord.')
      await indexEntityEmbedding(db, 'e2', 'c2', 'Strahd von Zarovich', 'A vampire lord.')

      const { fused } = await hybridSearchEntities(db, 'c1', 'Strahd', 10)
      expect(fused.map((r) => r.entityId)).toEqual(['e1'])
    },
    MODEL_LOAD_TIMEOUT,
  )
})
