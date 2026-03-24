import type Database from 'better-sqlite3'

/**
 * Initialize FTS5 tables. Call during migration or startup.
 * Uses a standalone FTS5 table (content stored inside FTS) plus a
 * mapping table for entity_id/campaign_id lookups.
 */
export function initFTS5(sqlite: Database.Database): void {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS entities_fts_map (
      rowid INTEGER PRIMARY KEY AUTOINCREMENT,
      entity_id TEXT NOT NULL UNIQUE,
      campaign_id TEXT NOT NULL
    );

    CREATE VIRTUAL TABLE IF NOT EXISTS entities_fts USING fts5(
      name,
      aliases,
      tags,
      body,
      tokenize='porter unicode61',
      prefix='2 3'
    );
  `)
}

/**
 * Index an entity in FTS5. Upserts by entity_id.
 */
export function indexEntity(
  sqlite: Database.Database,
  entityId: string,
  campaignId: string,
  name: string,
  aliases: string[],
  tags: string[],
  body: string,
): void {
  const aliasStr = aliases.join(' ')
  const tagStr = tags.join(' ')

  const existing = sqlite.prepare(
    'SELECT rowid FROM entities_fts_map WHERE entity_id = ?'
  ).get(entityId) as { rowid: number } | undefined

  if (existing) {
    // Delete old FTS entry and re-insert (FTS5 doesn't support UPDATE)
    sqlite.prepare('DELETE FROM entities_fts WHERE rowid = ?').run(existing.rowid)
    sqlite.prepare(`
      INSERT INTO entities_fts(rowid, name, aliases, tags, body)
      VALUES (?, ?, ?, ?, ?)
    `).run(existing.rowid, name, aliasStr, tagStr, body)

    // Update campaign mapping
    sqlite.prepare('UPDATE entities_fts_map SET campaign_id = ? WHERE entity_id = ?')
      .run(campaignId, entityId)
  } else {
    // Insert mapping first to get rowid
    const result = sqlite.prepare(
      'INSERT INTO entities_fts_map (entity_id, campaign_id) VALUES (?, ?)'
    ).run(entityId, campaignId)

    // Insert into FTS with matching rowid
    sqlite.prepare(`
      INSERT INTO entities_fts(rowid, name, aliases, tags, body)
      VALUES (?, ?, ?, ?, ?)
    `).run(result.lastInsertRowid, name, aliasStr, tagStr, body)
  }
}

/**
 * Remove an entity from the FTS5 index.
 */
export function removeEntityFromIndex(sqlite: Database.Database, entityId: string): void {
  const existing = sqlite.prepare(
    'SELECT rowid FROM entities_fts_map WHERE entity_id = ?'
  ).get(entityId) as { rowid: number } | undefined

  if (existing) {
    sqlite.prepare('DELETE FROM entities_fts WHERE rowid = ?').run(existing.rowid)
    sqlite.prepare('DELETE FROM entities_fts_map WHERE entity_id = ?').run(entityId)
  }
}

/**
 * Search entities with BM25 ranking and snippets.
 */
export function searchEntities(
  sqlite: Database.Database,
  campaignId: string,
  query: string,
  limit: number = 20,
): Array<{ entityId: string; name: string; snippet: string; score: number }> {
  if (!query.trim()) return []

  const ftsQuery = query.trim().replace(/"/g, '""') + '*'

  const results = sqlite.prepare(`
    SELECT
      m.entity_id as entityId,
      entities_fts.name,
      snippet(entities_fts, 3, '<mark>', '</mark>', '...', 30) as snippet,
      bm25(entities_fts, 10.0, 8.0, 2.0, 1.0) as score
    FROM entities_fts
    JOIN entities_fts_map m ON entities_fts.rowid = m.rowid
    WHERE entities_fts MATCH ?
      AND m.campaign_id = ?
    ORDER BY score
    LIMIT ?
  `).all(ftsQuery, campaignId, limit)

  return results as Array<{ entityId: string; name: string; snippet: string; score: number }>
}
