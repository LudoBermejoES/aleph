import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import Database from 'better-sqlite3'
import {
  initFTS5,
  indexEntity,
  removeEntityFromIndex,
  searchEntities,
  buildFtsQuery,
  toTrigrams,
} from '../../../server/services/search'

describe('FTS5 Search', () => {
  let sqlite: Database.Database

  beforeEach(() => {
    sqlite = new Database(':memory:')
    sqlite.pragma('foreign_keys = ON')
    initFTS5(sqlite)
  })

  afterEach(() => {
    sqlite.close()
  })

  it('indexes and finds an entity by name', () => {
    indexEntity(
      sqlite,
      'e1',
      'c1',
      'Strahd von Zarovich',
      ['Strahd'],
      ['vampire'],
      'A powerful vampire lord.',
    )
    const results = searchEntities(sqlite, 'c1', 'Strahd')
    expect(results).toHaveLength(1)
    expect(results[0].name).toBe('Strahd von Zarovich')
  })

  it('finds entity by body content', () => {
    indexEntity(
      sqlite,
      'e1',
      'c1',
      'Village of Barovia',
      [],
      ['village'],
      'A gloomy village nestled in the valley.',
    )
    const results = searchEntities(sqlite, 'c1', 'gloomy')
    expect(results).toHaveLength(1)
  })

  it('finds entity by alias', () => {
    indexEntity(
      sqlite,
      'e1',
      'c1',
      'Strahd von Zarovich',
      ['The Devil', 'Lord of Barovia'],
      [],
      'content',
    )
    const results = searchEntities(sqlite, 'c1', 'Devil')
    expect(results).toHaveLength(1)
  })

  it('finds entity by tag', () => {
    indexEntity(sqlite, 'e1', 'c1', 'Sunblade', [], ['weapon', 'legendary'], 'A radiant weapon.')
    const results = searchEntities(sqlite, 'c1', 'legendary')
    expect(results).toHaveLength(1)
  })

  it('returns empty for no matches', () => {
    indexEntity(sqlite, 'e1', 'c1', 'Strahd', [], [], 'content')
    const results = searchEntities(sqlite, 'c1', 'nonexistent')
    expect(results).toHaveLength(0)
  })

  it('scopes results to campaign', () => {
    indexEntity(sqlite, 'e1', 'campaign-a', 'Strahd', [], [], 'vampire lord')
    indexEntity(sqlite, 'e2', 'campaign-b', 'Acererak', [], [], 'lich lord')
    const results = searchEntities(sqlite, 'campaign-a', 'lord')
    expect(results).toHaveLength(1)
    expect(results[0].entityId).toBe('e1')
  })

  it('exact title match ranks higher than body mention', () => {
    indexEntity(sqlite, 'e1', 'c1', 'Strahd', [], [], 'The vampire lord of Barovia.')
    indexEntity(sqlite, 'e2', 'c1', 'Village of Barovia', [], [], 'Strahd watches from the castle.')
    const results = searchEntities(sqlite, 'c1', 'Strahd')
    expect(results[0].entityId).toBe('e1') // title match should rank higher
  })

  it('removeEntityFromIndex removes entity', () => {
    indexEntity(sqlite, 'e1', 'c1', 'Strahd', [], [], 'content')
    removeEntityFromIndex(sqlite, 'e1')
    const results = searchEntities(sqlite, 'c1', 'Strahd')
    expect(results).toHaveLength(0)
  })

  it('upserts on re-index', () => {
    indexEntity(sqlite, 'e1', 'c1', 'Strahd', [], [], 'old content')
    indexEntity(sqlite, 'e1', 'c1', 'Strahd von Zarovich', ['Strahd'], [], 'updated content')
    const results = searchEntities(sqlite, 'c1', 'updated')
    expect(results).toHaveLength(1)
    expect(results[0].name).toBe('Strahd von Zarovich')
  })

  it('returns empty for empty query', () => {
    indexEntity(sqlite, 'e1', 'c1', 'Strahd', [], [], 'content')
    const results = searchEntities(sqlite, 'c1', '')
    expect(results).toHaveLength(0)
  })

  it('matches diacritics bidirectionally', () => {
    indexEntity(sqlite, 'e1', 'c1', 'La búsqueda de Otto', [], [], 'content')
    expect(searchEntities(sqlite, 'c1', 'busqueda')).toHaveLength(1)
  })

  it('matches an accented query against unaccented content', () => {
    indexEntity(sqlite, 'e1', 'c1', 'Timon Sauerbeck', [], [], 'content')
    expect(searchEntities(sqlite, 'c1', 'Timón')).toHaveLength(1)
  })

  describe('quoted phrase search', () => {
    it('matches only the exact word sequence', () => {
      indexEntity(sqlite, 'e1', 'c1', 'La búsqueda de Otto', [], [], 'content')
      indexEntity(sqlite, 'e2', 'c1', 'Otto', [], [], 'una búsqueda distinta de la de Otto')
      const results = searchEntities(sqlite, 'c1', '"busqueda de otto"')
      expect(results).toHaveLength(1)
      expect(results[0].entityId).toBe('e1')
    })
  })

  describe('malformed/malicious query input', () => {
    it('does not throw on unbalanced quotes', () => {
      indexEntity(sqlite, 'e1', 'c1', 'Otto', [], [], 'content')
      expect(() => searchEntities(sqlite, 'c1', '"otto')).not.toThrow()
    })

    it('does not throw on stray FTS5 special characters', () => {
      indexEntity(sqlite, 'e1', 'c1', 'Otto', [], [], 'content')
      expect(() => searchEntities(sqlite, 'c1', 'name:otto OR *')).not.toThrow()
    })

    it('a column-filter-style query does not leak into unintended columns', () => {
      indexEntity(sqlite, 'e1', 'c1', 'Otto', [], ['secret-alias'], 'public content')
      // "aliases:" as typed text should be treated as a literal search term,
      // not parsed as an FTS5 column filter.
      const results = searchEntities(sqlite, 'c1', 'aliases:secret-alias')
      expect(results).toHaveLength(0)
    })
  })

  describe('typo-tolerant fallback', () => {
    it('finds an entity despite a single-character typo when primary results are sparse', () => {
      indexEntity(sqlite, 'e1', 'c1', 'Katarina Kornfeld', [], [], 'Príncipe de Berlín')
      const results = searchEntities(sqlite, 'c1', 'Kornfelt')
      expect(results.some((r) => r.entityId === 'e1')).toBe(true)
    })

    it('does not invoke the fallback when primary results already meet the threshold', () => {
      indexEntity(sqlite, 'e1', 'c1', 'Otto von Grugger', [], [], 'content')
      indexEntity(sqlite, 'e2', 'c1', 'Otto impersonator', [], [], 'content')
      indexEntity(sqlite, 'e3', 'c1', 'Otto again', [], [], 'content')
      indexEntity(sqlite, 'e4', 'c1', 'Completely unrelated', [], [], 'mentions Otto once')
      const results = searchEntities(sqlite, 'c1', 'Otto')
      // enough primary matches exist that no fuzzy-only candidate should be needed to fill results
      expect(results.length).toBeGreaterThanOrEqual(3)
    })

    it('removes an entity from fuzzy-fallback candidates on delete', () => {
      indexEntity(sqlite, 'e1', 'c1', 'Katarina Kornfeld', [], [], 'content')
      removeEntityFromIndex(sqlite, 'e1')
      const results = searchEntities(sqlite, 'c1', 'Kornfelt')
      expect(results.some((r) => r.entityId === 'e1')).toBe(false)
    })

    it('scopes fuzzy fallback matches to the requested campaign', () => {
      indexEntity(sqlite, 'e1', 'campaign-a', 'Katarina Kornfeld', [], [], 'content')
      const results = searchEntities(sqlite, 'campaign-b', 'Kornfelt')
      expect(results).toHaveLength(0)
    })
  })

  describe('buildFtsQuery', () => {
    it('wraps plain terms as quoted-prefix queries', () => {
      // `otto` is its own stem, so it keeps the bare shape; `busqueda` stems to `busqued`
      // and gains an OR'd exact clause against the `stems` column. The parentheses are
      // load-bearing: FTS5 binds AND tighter than OR, so without them a two-word query
      // would parse as an any-of query.
      expect(buildFtsQuery('otto busqueda')).toBe('"otto"* AND ("busqueda"* OR "busqued")')
    })

    it('leaves a term alone when it is already its own stem', () => {
      expect(buildFtsQuery('otto')).toBe('"otto"*')
    })

    it('preserves an exact phrase without a prefix wildcard', () => {
      expect(buildFtsQuery('"la busqueda de otto"')).toBe('"la busqueda de otto"')
    })

    it('rebuilds a NEAR() query from sanitized inner terms', () => {
      expect(buildFtsQuery('NEAR(otto salvador, 5)')).toBe('NEAR("otto" "salvador", 5)')
    })

    it('escapes embedded quotes rather than breaking the query', () => {
      expect(buildFtsQuery('o"tto')).toBe('"o""tto"*')
    })
  })

  describe('toTrigrams', () => {
    it('produces overlapping trigrams for a short name', () => {
      expect(toTrigrams('Oda')).toEqual(expect.arrayContaining([' od', 'oda', 'da ']))
    })

    it('returns an empty array for inputs shorter than 3 characters', () => {
      expect(toTrigrams('a')).toEqual([])
    })
  })
})
