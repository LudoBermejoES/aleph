import type Database from 'better-sqlite3'

/** Below this many primary FTS5 results, the trigram fuzzy fallback also runs. */
const FUZZY_FALLBACK_THRESHOLD = 3
/** Minimum trigram overlap (shared 3-grams) for a fuzzy candidate to be considered relevant. */
const FUZZY_MIN_OVERLAP = 2

/**
 * Initialize FTS5 tables. Call during migration or startup.
 * Uses a standalone FTS5 table (content stored inside FTS) plus a
 * mapping table for entity_id/campaign_id lookups.
 *
 * Also initializes a plain-SQL trigram table used as a typo-tolerant
 * fallback when FTS5 (exact/prefix) matching returns few or no results.
 * This is deliberately NOT a compiled SQLite extension (e.g. spellfix1) —
 * see openspec/changes/add-semantic-search/design.md for why: better-sqlite3
 * extension loading + a second native dependency's build story is more
 * fragile than a pure-SQL/TS trigram index for this use case.
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

    CREATE TABLE IF NOT EXISTS entity_trigrams (
      trigram TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      campaign_id TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_entity_trigrams_lookup
      ON entity_trigrams (campaign_id, trigram);

    CREATE INDEX IF NOT EXISTS idx_entity_trigrams_entity
      ON entity_trigrams (entity_id);
  `)
}

/**
 * Split text into lowercase, whitespace-padded character trigrams.
 * Padding with a single leading/trailing space lets short (<3 char) inputs
 * still produce at least one trigram and helps match word boundaries.
 */
export function toTrigrams(text: string): string[] {
  const trimmedLower = text.toLowerCase().trim()
  if (trimmedLower.length < 2) return []
  const normalized = ` ${trimmedLower} `.replace(/\s+/g, ' ')
  const trigrams = new Set<string>()
  for (let i = 0; i <= normalized.length - 3; i++) {
    trigrams.add(normalized.slice(i, i + 3))
  }
  return Array.from(trigrams)
}

/**
 * Index an entity in FTS5 and in the trigram fallback table. Upserts by entity_id.
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

  const existing = sqlite
    .prepare('SELECT rowid FROM entities_fts_map WHERE entity_id = ?')
    .get(entityId) as { rowid: number } | undefined

  if (existing) {
    // Delete old FTS entry and re-insert (FTS5 doesn't support UPDATE)
    sqlite.prepare('DELETE FROM entities_fts WHERE rowid = ?').run(existing.rowid)
    sqlite
      .prepare(
        `
      INSERT INTO entities_fts(rowid, name, aliases, tags, body)
      VALUES (?, ?, ?, ?, ?)
    `,
      )
      .run(existing.rowid, name, aliasStr, tagStr, body)

    // Update campaign mapping
    sqlite
      .prepare('UPDATE entities_fts_map SET campaign_id = ? WHERE entity_id = ?')
      .run(campaignId, entityId)
  } else {
    // Insert mapping first to get rowid
    const result = sqlite
      .prepare('INSERT INTO entities_fts_map (entity_id, campaign_id) VALUES (?, ?)')
      .run(entityId, campaignId)

    // Insert into FTS with matching rowid
    sqlite
      .prepare(
        `
      INSERT INTO entities_fts(rowid, name, aliases, tags, body)
      VALUES (?, ?, ?, ?, ?)
    `,
      )
      .run(result.lastInsertRowid, name, aliasStr, tagStr, body)
  }

  // Trigrams only cover name + aliases (short, proper-noun-heavy fields where
  // typos actually matter — not the long-form body text).
  sqlite.prepare('DELETE FROM entity_trigrams WHERE entity_id = ?').run(entityId)
  const trigramSet = new Set<string>([...toTrigrams(name), ...aliases.flatMap(toTrigrams)])
  if (trigramSet.size > 0) {
    const insertTrigram = sqlite.prepare(
      'INSERT INTO entity_trigrams (trigram, entity_id, campaign_id) VALUES (?, ?, ?)',
    )
    const insertMany = sqlite.transaction((trigrams: string[]) => {
      for (const trigram of trigrams) insertTrigram.run(trigram, entityId, campaignId)
    })
    insertMany(Array.from(trigramSet))
  }
}

/**
 * Remove an entity from the FTS5 index and the trigram fallback table.
 */
export function removeEntityFromIndex(sqlite: Database.Database, entityId: string): void {
  const existing = sqlite
    .prepare('SELECT rowid FROM entities_fts_map WHERE entity_id = ?')
    .get(entityId) as { rowid: number } | undefined

  if (existing) {
    sqlite.prepare('DELETE FROM entities_fts WHERE rowid = ?').run(existing.rowid)
    sqlite.prepare('DELETE FROM entities_fts_map WHERE entity_id = ?').run(entityId)
  }
  sqlite.prepare('DELETE FROM entity_trigrams WHERE entity_id = ?').run(entityId)
}

/** Escape a single term for safe inclusion in an FTS5 MATCH query as a literal quoted phrase. */
function escapeFtsTerm(term: string): string {
  return `"${term.replace(/"/g, '""')}"`
}

/**
 * Build a safe FTS5 MATCH query string from raw user input.
 *
 * Supports:
 *  - Quoted phrases: `"exact phrase"` — passed through as a literal FTS5 phrase.
 *  - Proximity queries: `NEAR(term1 term2, N)` — inner terms are individually
 *    sanitized before being rebuilt into a NEAR(...) clause.
 *  - Everything else: treated as individual terms, each wrapped in its own
 *    quoted-phrase + trailing `*` (e.g. `"otto"*`), which both neutralizes any
 *    FTS5 special characters (column filters, NOT/AND/OR keywords, parens)
 *    the user might type and preserves prefix-matching behavior. Multiple
 *    terms are implicitly ANDed by FTS5's default query syntax, matching the
 *    pre-existing (if buggier) behavior.
 */
export function buildFtsQuery(rawQuery: string): string {
  const trimmed = rawQuery.trim()
  if (!trimmed) return ''

  const parts: string[] = []
  const phraseRegex = /"([^"]*)"/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  const pushPlainTerms = (segment: string) => {
    for (const term of segment.split(/\s+/)) {
      if (term) parts.push(`${escapeFtsTerm(term)}*`)
    }
  }

  while ((match = phraseRegex.exec(trimmed)) !== null) {
    pushPlainTerms(trimmed.slice(lastIndex, match.index))
    const phraseContent = match[1].trim()
    if (phraseContent) parts.push(escapeFtsTerm(phraseContent))
    lastIndex = phraseRegex.lastIndex
  }

  const remainder = trimmed.slice(lastIndex).trim()

  // A NEAR(...) block is only recognized when it's the *entire* remaining
  // query (not mixed with other free terms) to keep the parsing unambiguous.
  // Per FTS5 syntax the distance is INSIDE the parens: NEAR(term1 term2, N).
  const nearMatch =
    parts.length === 0 ? remainder.match(/^NEAR\(\s*([^,)]+?)\s*(?:,\s*(\d+)\s*)?\)$/i) : null

  if (nearMatch) {
    const innerTerms = nearMatch[1].split(/\s+/).filter(Boolean).map(escapeFtsTerm).join(' ')
    if (innerTerms) {
      const distance = nearMatch[2] || '10'
      return `NEAR(${innerTerms}, ${distance})`
    }
    return ''
  }

  pushPlainTerms(remainder)
  return parts.join(' ')
}

/**
 * Whether a raw query uses explicit phrase (`"..."`) or NEAR(...) syntax —
 * i.e. the user asked for precise matching, so the typo-tolerant fuzzy
 * fallback should NOT run even if the precise query returns few results.
 */
function usesExplicitPrecisionSyntax(rawQuery: string): boolean {
  const trimmed = rawQuery.trim()
  return trimmed.includes('"') || /^NEAR\(/i.test(trimmed)
}

interface SearchResult {
  entityId: string
  name: string
  snippet: string
  score: number
}

/**
 * Typo-tolerant fallback: find entities whose name/aliases share enough
 * character trigrams with the query term to be a plausible fuzzy match.
 * Pure SQL + JS, no compiled extension (see design.md).
 */
function searchEntitiesFuzzy(
  sqlite: Database.Database,
  campaignId: string,
  query: string,
  excludeEntityIds: Set<string>,
  limit: number,
): SearchResult[] {
  const queryTrigrams = toTrigrams(query)
  if (queryTrigrams.length === 0) return []

  const placeholders = queryTrigrams.map(() => '?').join(',')
  const rows = sqlite
    .prepare(
      `
    SELECT entity_id as entityId, COUNT(*) as overlap
    FROM entity_trigrams
    WHERE campaign_id = ? AND trigram IN (${placeholders})
    GROUP BY entity_id
    HAVING overlap >= ?
    ORDER BY overlap DESC
    LIMIT ?
  `,
    )
    .all(campaignId, ...queryTrigrams, FUZZY_MIN_OVERLAP, limit) as Array<{
    entityId: string
    overlap: number
  }>

  const candidates = rows.filter((r) => !excludeEntityIds.has(r.entityId))
  if (candidates.length === 0) return []

  const idPlaceholders = candidates.map(() => '?').join(',')
  const nameRows = sqlite
    .prepare(
      `
    SELECT m.entity_id as entityId, entities_fts.name as name
    FROM entities_fts
    JOIN entities_fts_map m ON entities_fts.rowid = m.rowid
    WHERE m.entity_id IN (${idPlaceholders})
  `,
    )
    .all(...candidates.map((c) => c.entityId)) as Array<{ entityId: string; name: string }>

  const nameById = new Map(nameRows.map((r) => [r.entityId, r.name]))
  const maxOverlap = Math.max(...candidates.map((c) => c.overlap))

  // Fuzzy-only results are scored below the lowest realistic primary FTS5
  // score by construction (see searchEntities: primary results are sorted
  // ascending by bm25(), and these are appended after all of them).
  return candidates.map((c) => ({
    entityId: c.entityId,
    name: nameById.get(c.entityId) ?? '',
    snippet: nameById.get(c.entityId) ?? '',
    score: -c.overlap / maxOverlap, // informational only; ordering is by list position, see below
  }))
}

/**
 * Search entities with BM25 ranking (per-column weighted), phrase/NEAR query
 * support, and a typo-tolerant trigram fallback when primary results are sparse.
 */
export function searchEntities(
  sqlite: Database.Database,
  campaignId: string,
  query: string,
  limit: number = 20,
): SearchResult[] {
  if (!query.trim()) return []

  const ftsQuery = buildFtsQuery(query)
  if (!ftsQuery) return []

  let primaryResults: SearchResult[]
  try {
    primaryResults = sqlite
      .prepare(
        `
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
    `,
      )
      .all(ftsQuery, campaignId, limit) as SearchResult[]
  } catch {
    // Malformed FTS5 syntax that slipped through buildFtsQuery (e.g. an
    // unbalanced NEAR() the regex didn't fully validate) — fail closed to
    // no primary results rather than surfacing a 500 to the caller.
    primaryResults = []
  }

  if (primaryResults.length >= FUZZY_FALLBACK_THRESHOLD || usesExplicitPrecisionSyntax(query)) {
    return primaryResults
  }

  const remainingSlots = limit - primaryResults.length
  if (remainingSlots <= 0) return primaryResults

  const excludeIds = new Set(primaryResults.map((r) => r.entityId))
  const fuzzyResults = searchEntitiesFuzzy(sqlite, campaignId, query, excludeIds, remainingSlots)

  return [...primaryResults, ...fuzzyResults]
}
