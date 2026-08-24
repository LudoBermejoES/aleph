import type Database from 'better-sqlite3'
import { stripSecretBlocks, seesSecretContent } from './content'
import { logger } from '../utils/logger'
import { stemSpanishText, stemSpanishWord } from './spanish-stem'

/** Below this many primary FTS5 results, the trigram fuzzy fallback also runs. */
const FUZZY_FALLBACK_THRESHOLD = 3
/** Minimum trigram overlap (shared 3-grams) for a fuzzy candidate to be considered relevant. */
const FUZZY_MIN_OVERLAP = 2

/**
 * The two role-scoped copies of the lexical index.
 *
 * `full` holds the markdown as written, secret blocks included; `filtered` holds the same
 * entity with `stripSecretBlocks` already applied to its body. Which one a query reaches is
 * decided by the caller's role and nothing else.
 *
 * Two indices that must agree about the same content are two copies maintained by hand, and
 * this codebase has been bitten by exactly that before. Three things make divergence
 * structurally impossible rather than merely unlikely:
 *
 *  1. **One DDL, one loop.** Both tables are created from the single template below, so they
 *     cannot differ in shape.
 *  2. **One rowid, one write.** `indexEntity` derives every field once, from one entity, and
 *     writes both rows inside a single transaction keyed on the SAME `entities_fts_map`
 *     rowid. There is no code path that writes one without the other.
 *  3. **A guard.** `findIndexParityGaps` fails if either table holds an entity the other
 *     does not; `tests/unit/server/search-index-parity.test.ts` runs it over every
 *     index/update/delete path, and `server/plugins/watcher.ts` runs it at boot.
 */
export const FTS_TABLES = {
  full: 'entities_fts',
  filtered: 'entities_fts_filtered',
} as const

export type IndexVariant = keyof typeof FTS_TABLES

/**
 * The role the FILTERED index is built for: the least-privileged viewer that can query it.
 *
 * `stripSecretBlocks` returns content untouched only at `co_dm` and above, so `editor` (3)
 * is BELOW the line — an editor already receives filtered prose from every other endpoint,
 * and the index has to give the same answer or the two disagree about the same content.
 * Stripping at the floor also means a `:::secret{.editor}` block an editor may legitimately
 * read is not searchable by them: that fails closed, which is the correct direction for a
 * two-index split, and is noted in the change's spec rather than papered over.
 */
export const FILTERED_INDEX_ROLE = 'visitor'

/** Which copy of the index a role may query. Anything below `co_dm` gets the filtered one. */
export function indexVariantForRole(role: string): IndexVariant {
  return seesSecretContent(role) ? 'full' : 'filtered'
}

/**
 * Column list, shared by both tables so their shapes cannot drift apart.
 *
 * `stems` is new and is the Spanish-morphology fix: FTS5's only stemmer is `porter`, which
 * is English, and there is no Spanish tokenizer to swap in (a custom FTS5 tokenizer is a C
 * callback `better-sqlite3` cannot register — the same constraint that produced the
 * hand-rolled trigram table below). So the stems are computed in JS at index time and
 * queried as an extra OR'd clause; see `buildFtsQuery`.
 *
 * The per-column BM25 weighting is deliberately untouched — `bm25(entities_fts, 10.0, 8.0,
 * 2.0, 1.0)` is still passed FOUR weights against these five columns, because SQLite
 * defaults any unsupplied weight to 1.0 (verified: the four-weight call and the same call
 * with an explicit trailing 1.0 return bit-identical scores, while 0.0 and 7.0 do not). The
 * name/alias/tag/body weights are therefore the same numbers on the same columns, and the
 * new column enters at the default.
 */
const FTS_COLUMNS = 'name, aliases, tags, body, stems'

/** Snippets come from `body`, which is column index 3 in `FTS_COLUMNS`. */
const SNIPPET_COLUMN = 3

/** Measured and sound; out of scope for this change. Four weights, five columns — see above. */
const BM25_WEIGHTS = '10.0, 8.0, 2.0, 1.0'

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
 *
 * An FTS5 table cannot be ALTERed, so the `stems` column and the second table arrive by
 * dropping and recreating. The rows are NOT re-read from disk to repopulate them: the old
 * table already holds the same text the files do, so the migration reads it out, drops,
 * recreates and re-inserts — no filesystem pass, and `entities_fts_map` survives untouched.
 *
 * That matters operationally. The obvious version (drop the map too and let the boot
 * backfill re-read every file) was measured against this project's own database — 1,495
 * entities — and the plugin that runs it is `await`ed before Nitro serves, so it would have
 * held a live campaign's site down for the duration. See `initVecTable` for the same
 * decision on the vector side, where it was worth ~7 minutes.
 */
export function initFTS5(sqlite: Database.Database): { migrated: number } {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS entities_fts_map (
      rowid INTEGER PRIMARY KEY AUTOINCREMENT,
      entity_id TEXT NOT NULL UNIQUE,
      campaign_id TEXT NOT NULL
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

  // Probed BEFORE the tables are created, or creating the missing copy would itself make the
  // index look current — and the migration would skip, leaving one copy populated and the
  // other empty.
  const legacyRows = readLegacyIndex(sqlite)

  const createBoth = (ifNotExists: boolean) => {
    // One template, both tables — the shapes cannot drift apart.
    for (const table of Object.values(FTS_TABLES)) {
      sqlite.exec(`
        CREATE VIRTUAL TABLE ${ifNotExists ? 'IF NOT EXISTS ' : ''}${table} USING fts5(
          ${FTS_COLUMNS},
          tokenize='porter unicode61',
          prefix='2 3'
        );
      `)
    }
  }

  if (legacyRows === null) {
    createBoth(true)
    return { migrated: 0 }
  }

  // ONE transaction around drop + recreate + refill. SQLite makes DDL transactional, so an
  // interrupted migration rolls all the way back to the working old index instead of
  // leaving `entities_fts_map` full and the tables empty — a state nothing repairs on its
  // own, because the boot backfill skips every entity the map already knows. Observed for
  // real while building this: killing the dev server mid-migration left 1,383 mapped
  // entities against 113 indexed rows, and no restart would have fixed it.
  const migrate = sqlite.transaction(() => {
    sqlite.exec(`
      DROP TABLE IF EXISTS ${FTS_TABLES.full};
      DROP TABLE IF EXISTS ${FTS_TABLES.filtered};
    `)
    createBoth(false)
    for (const row of legacyRows) {
      writeIndexRow(sqlite, row.rowid, row.name, row.aliases, row.tags, row.body)
    }
  })
  migrate()
  return { migrated: legacyRows.length }
}

/**
 * Rebuild whatever the map says should be indexed but is not — the repair path for an index
 * that ended up inconsistent by some route the migration's own transaction cannot cover
 * (a crash between two connections, a manual edit, a restore of half a backup).
 *
 * It can only work from text the index still holds, so an entity missing from BOTH copies is
 * reported, not invented: that one needs the filesystem backfill. Returns what it could not
 * fix so the caller can say so out loud rather than log a reassuring number.
 */
export function repairIndexParity(sqlite: Database.Database): {
  repaired: number
  unrecoverable: string[]
} {
  const unrecoverable: string[] = []
  let repaired = 0

  const rows = sqlite
    .prepare(
      `SELECT m.rowid AS rowid, m.entity_id AS entityId
       FROM entities_fts_map m
       WHERE m.rowid NOT IN (SELECT rowid FROM ${FTS_TABLES.full})
          OR m.rowid NOT IN (SELECT rowid FROM ${FTS_TABLES.filtered})`,
    )
    .all() as Array<{ rowid: number; entityId: string }>

  const fix = sqlite.transaction(() => {
    for (const { rowid, entityId } of rows) {
      // Whichever copy still has the row is the source of truth for the text; the full one
      // first, since the filtered one has already lost the secret blocks.
      const source =
        (sqlite
          .prepare(`SELECT name, aliases, tags, body FROM ${FTS_TABLES.full} WHERE rowid = ?`)
          .get(rowid) as LegacyRow | undefined) ??
        (sqlite
          .prepare(`SELECT name, aliases, tags, body FROM ${FTS_TABLES.filtered} WHERE rowid = ?`)
          .get(rowid) as LegacyRow | undefined)

      if (!source) {
        unrecoverable.push(entityId)
        continue
      }
      for (const table of Object.values(FTS_TABLES)) {
        sqlite.prepare(`DELETE FROM ${table} WHERE rowid = ?`).run(rowid)
      }
      writeIndexRow(sqlite, rowid, source.name, source.aliases, source.tags, source.body)
      repaired++
    }
  })
  fix()

  return { repaired, unrecoverable }
}

interface LegacyRow {
  rowid: number
  name: string
  aliases: string
  tags: string
  body: string
}

/**
 * The contents of an index written by the previous schema, or `null` when there is nothing
 * to migrate — either a fresh database or one already on the current shape.
 *
 * "Previous schema" means either copy is missing the `stems` column, or the filtered copy
 * does not exist at all. Both mean the stored index cannot answer correctly, and a half-
 * correct search index is worse than an absent one because it looks like it works.
 */
function readLegacyIndex(sqlite: Database.Database): LegacyRow[] | null {
  const tableNames = new Set(
    (
      sqlite.prepare(`SELECT name FROM sqlite_master WHERE type = 'table'`).all() as Array<{
        name: string
      }>
    ).map((r) => r.name),
  )
  if (!tableNames.has(FTS_TABLES.full)) return null

  const columnsOf = (table: string) =>
    (sqlite.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>).map(
      (r) => r.name,
    )

  const stale =
    !tableNames.has(FTS_TABLES.filtered) ||
    Object.values(FTS_TABLES)
      .filter((t) => tableNames.has(t))
      .some((t) => !columnsOf(t).includes('stems'))
  if (!stale) return null

  return sqlite
    .prepare(`SELECT rowid, name, aliases, tags, body FROM ${FTS_TABLES.full}`)
    .all() as LegacyRow[]
}

/**
 * Write ONE entity into BOTH copies, under one rowid. The single place either table is
 * written, so `indexEntity` and the schema migration cannot disagree about what a row
 * should contain — and there is no way to call it for one variant only.
 */
function writeIndexRow(
  sqlite: Database.Database,
  rowid: number | bigint,
  name: string,
  aliasStr: string,
  tagStr: string,
  body: string,
): void {
  const bodyByVariant: Record<IndexVariant, string> = {
    full: body,
    filtered: stripSecretBlocks(body, FILTERED_INDEX_ROLE),
  }
  for (const [variant, table] of Object.entries(FTS_TABLES) as Array<[IndexVariant, string]>) {
    const variantBody = bodyByVariant[variant]
    sqlite
      .prepare(`INSERT INTO ${table}(rowid, ${FTS_COLUMNS}) VALUES (?, ?, ?, ?, ?, ?)`)
      .run(
        rowid,
        name,
        aliasStr,
        tagStr,
        variantBody,
        stemSpanishText(`${name} ${aliasStr} ${tagStr} ${variantBody}`),
      )
  }
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
 * Index an entity in both copies of the FTS5 index and in the trigram fallback table.
 * Upserts by entity_id.
 *
 * ONE pass over ONE entity: every field is derived once, here, and both rows are written
 * under the same `entities_fts_map` rowid inside a single transaction. There is deliberately
 * no per-variant entry point — a caller cannot write one index without the other, which is
 * the only way two indices stay in step without anyone remembering to keep them there.
 *
 * Only `body` differs between the two: it is the sole field that holds markdown, and so the
 * only one a `:::secret` block can live in. `name`/`aliases`/`tags` are short structured
 * fields the app never renders as markdown, and keeping them identical is what lets the
 * trigram fallback stay a single table rather than a third thing to synchronise.
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

  const write = sqlite.transaction(() => {
    const existing = sqlite
      .prepare('SELECT rowid FROM entities_fts_map WHERE entity_id = ?')
      .get(entityId) as { rowid: number } | undefined

    let rowid: number | bigint
    if (existing) {
      rowid = existing.rowid
      sqlite
        .prepare('UPDATE entities_fts_map SET campaign_id = ? WHERE entity_id = ?')
        .run(campaignId, entityId)
    } else {
      rowid = sqlite
        .prepare('INSERT INTO entities_fts_map (entity_id, campaign_id) VALUES (?, ?)')
        .run(entityId, campaignId).lastInsertRowid
    }

    // FTS5 has no UPDATE; delete-then-insert, same as before.
    if (existing) {
      for (const table of Object.values(FTS_TABLES)) {
        sqlite.prepare(`DELETE FROM ${table} WHERE rowid = ?`).run(rowid)
      }
    }
    writeIndexRow(sqlite, rowid, name, aliasStr, tagStr, body)

    // Trigrams only cover name + aliases (short, proper-noun-heavy fields where
    // typos actually matter — not the long-form body text). Those two fields are
    // identical in both variants, so one table serves both and there is nothing to
    // keep in sync.
    sqlite.prepare('DELETE FROM entity_trigrams WHERE entity_id = ?').run(entityId)
    const trigramSet = new Set<string>([...toTrigrams(name), ...aliases.flatMap(toTrigrams)])
    if (trigramSet.size > 0) {
      const insertTrigram = sqlite.prepare(
        'INSERT INTO entity_trigrams (trigram, entity_id, campaign_id) VALUES (?, ?, ?)',
      )
      for (const trigram of trigramSet) insertTrigram.run(trigram, entityId, campaignId)
    }
  })

  write()
}

/**
 * Remove an entity from both copies of the FTS5 index and from the trigram fallback table.
 * One transaction, for the same reason `indexEntity` uses one: a half-applied delete would
 * leave a secret reachable in whichever index survived it.
 */
export function removeEntityFromIndex(sqlite: Database.Database, entityId: string): void {
  const drop = sqlite.transaction(() => {
    const existing = sqlite
      .prepare('SELECT rowid FROM entities_fts_map WHERE entity_id = ?')
      .get(entityId) as { rowid: number } | undefined

    if (existing) {
      for (const table of Object.values(FTS_TABLES)) {
        sqlite.prepare(`DELETE FROM ${table} WHERE rowid = ?`).run(existing.rowid)
      }
      sqlite.prepare('DELETE FROM entities_fts_map WHERE entity_id = ?').run(entityId)
    }
    sqlite.prepare('DELETE FROM entity_trigrams WHERE entity_id = ?').run(entityId)
  })
  drop()
}

/**
 * The divergence guard: every complaint about the two indices disagreeing about WHICH
 * entities they hold. Returns one human-readable line per problem, empty when they agree.
 *
 * Content equality is deliberately NOT asserted — the two bodies are supposed to differ,
 * that is the whole point. What must never differ is the SET of entities, because a gap
 * there is either a secret still reachable in the filtered index or an entity a Narrator
 * can no longer find.
 */
export function findIndexParityGaps(sqlite: Database.Database): string[] {
  const problems: string[] = []
  const mapped = new Set(
    (sqlite.prepare('SELECT rowid FROM entities_fts_map').all() as Array<{ rowid: number }>).map(
      (r) => r.rowid,
    ),
  )

  const rowidsByTable = new Map<string, Set<number>>()
  for (const table of Object.values(FTS_TABLES)) {
    rowidsByTable.set(
      table,
      new Set(
        (sqlite.prepare(`SELECT rowid FROM ${table}`).all() as Array<{ rowid: number }>).map(
          (r) => r.rowid,
        ),
      ),
    )
  }

  for (const [table, rowids] of rowidsByTable) {
    const missing = [...mapped].filter((r) => !rowids.has(r))
    const extra = [...rowids].filter((r) => !mapped.has(r))
    if (missing.length) {
      problems.push(
        `${table} is missing ${missing.length} indexed entities (rowids ${missing.slice(0, 5).join(', ')}${missing.length > 5 ? ', …' : ''})`,
      )
    }
    if (extra.length) {
      problems.push(
        `${table} holds ${extra.length} rows with no entity mapping (rowids ${extra.slice(0, 5).join(', ')}${extra.length > 5 ? ', …' : ''})`,
      )
    }
  }

  return problems
}

/** `findIndexParityGaps`, as an assertion. Used by the tests and by the boot check. */
export function assertIndexParity(sqlite: Database.Database): void {
  const problems = findIndexParityGaps(sqlite)
  if (problems.length) {
    throw new Error(`Search index parity broken:\n  ${problems.join('\n  ')}`)
  }
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
 *  - Spanish morphology: each plain term additionally matches its own stem in the
 *    `stems` column, as `("term"* OR "stem")`. Quoted phrases and NEAR(...) are left
 *    alone — those are the syntax a user reaches for when they want the exact words.
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
      if (!term) continue
      const surface = `${escapeFtsTerm(term)}*`
      const stem = stemSpanishWord(term)

      // The surface clause is exactly what it was, so nothing that matched before can stop
      // matching — morphology can only ADD reach here. The stem clause is an EXACT match,
      // not a prefix: `"casa"*` already reaches `casas`/`casamiento`, and a prefix on the
      // stem (`cas*`) would additionally drag in `castillo` and `casco`. Precision is not
      // the thing that is broken.
      if (!stem || stem === term.toLowerCase()) {
        parts.push(surface)
      } else {
        // Parenthesised because FTS5 binds AND tighter than OR: `a OR b c OR d` would parse
        // as `a OR (b AND c) OR d` and quietly turn a two-word query into an any-of query.
        parts.push(`(${surface} OR ${escapeFtsTerm(stem)})`)
      }
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

  // Explicit AND, not the implicit concatenation this used to rely on. FTS5 accepts
  // `"a"* "b"*` but rejects `("a"* OR "x") "b"*` outright — `fts5: syntax error near "b"` —
  // and `searchEntities` catches that and returns no results, so the whole thing would have
  // failed SILENTLY on any multi-word query containing a stemmable term. Caught by
  // `watcher.test.ts`'s "updated content hash triggers re-index"; the two are equivalent
  // when no group is present, so this is only ever a widening of what parses.
  return parts.join(' AND ')
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
  table: string,
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
    SELECT m.entity_id as entityId, ${table}.name as name
    FROM ${table}
    JOIN entities_fts_map m ON ${table}.rowid = m.rowid
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
 *
 * `role` picks which copy of the index is queried — anything below `co_dm` gets the one
 * built from already-filtered text, so a term that lives only inside a `:::secret` block
 * returns NOTHING rather than a scrubbed excerpt. Both halves of the leak close that way:
 * the text, and the fact that a result exists at all.
 *
 * It defaults to `visitor`, the harshest role, so a caller that forgets to pass one loses
 * the Narrator's reach rather than a player's secrets — the same fail-closed default
 * `getEffectiveRole` and the response-wide filter already use.
 */
export function searchEntities(
  sqlite: Database.Database,
  campaignId: string,
  query: string,
  limit: number = 20,
  role: string = 'visitor',
): SearchResult[] {
  if (!query.trim()) return []

  const ftsQuery = buildFtsQuery(query)
  if (!ftsQuery) return []

  const table = FTS_TABLES[indexVariantForRole(role)]

  let primaryResults: SearchResult[]
  try {
    primaryResults = sqlite
      .prepare(
        `
      SELECT
        m.entity_id as entityId,
        ${table}.name,
        snippet(${table}, ${SNIPPET_COLUMN}, '<mark>', '</mark>', '...', 30) as snippet,
        bm25(${table}, ${BM25_WEIGHTS}) as score
      FROM ${table}
      JOIN entities_fts_map m ON ${table}.rowid = m.rowid
      WHERE ${table} MATCH ?
        AND m.campaign_id = ?
      ORDER BY score
      LIMIT ?
    `,
      )
      .all(ftsQuery, campaignId, limit) as SearchResult[]
  } catch (error) {
    // Malformed FTS5 syntax that slipped through buildFtsQuery (e.g. an
    // unbalanced NEAR() the regex didn't fully validate) — fail closed to
    // no primary results rather than surfacing a 500 to the caller.
    //
    // Logged, because silence here is how a generated-query bug hides: the AND fix above
    // exists because this catch turned an FTS5 syntax error into a plausible-looking
    // "no results" for every multi-word query, and only an unrelated test noticed.
    logger.warn('FTS5 rejected a generated query; returning no lexical results', {
      query,
      ftsQuery,
      error: error instanceof Error ? error.message : String(error),
    })
    primaryResults = []
  }

  if (primaryResults.length >= FUZZY_FALLBACK_THRESHOLD || usesExplicitPrecisionSyntax(query)) {
    return primaryResults
  }

  const remainingSlots = limit - primaryResults.length
  if (remainingSlots <= 0) return primaryResults

  const excludeIds = new Set(primaryResults.map((r) => r.entityId))
  const fuzzyResults = searchEntitiesFuzzy(
    sqlite,
    campaignId,
    query,
    excludeIds,
    remainingSlots,
    table,
  )

  return [...primaryResults, ...fuzzyResults]
}
