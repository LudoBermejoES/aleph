import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import Database from 'better-sqlite3'
import { initFTS5, indexEntity, removeEntityFromIndex, searchEntities } from '../../../server/services/search'

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
    indexEntity(sqlite, 'e1', 'c1', 'Strahd von Zarovich', ['Strahd'], ['vampire'], 'A powerful vampire lord.')
    const results = searchEntities(sqlite, 'c1', 'Strahd')
    expect(results).toHaveLength(1)
    expect(results[0].name).toBe('Strahd von Zarovich')
  })

  it('finds entity by body content', () => {
    indexEntity(sqlite, 'e1', 'c1', 'Village of Barovia', [], ['village'], 'A gloomy village nestled in the valley.')
    const results = searchEntities(sqlite, 'c1', 'gloomy')
    expect(results).toHaveLength(1)
  })

  it('finds entity by alias', () => {
    indexEntity(sqlite, 'e1', 'c1', 'Strahd von Zarovich', ['The Devil', 'Lord of Barovia'], [], 'content')
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
})
