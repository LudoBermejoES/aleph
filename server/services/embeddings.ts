import type Database from 'better-sqlite3'
import * as sqliteVec from 'sqlite-vec'
import { pipeline, env, type FeatureExtractionPipeline } from '@huggingface/transformers'
import { join } from 'path'
import { stripSecretBlocks } from './content'
import { indexVariantForRole, FILTERED_INDEX_ROLE, FTS_TABLES, type IndexVariant } from './search'
import { logger } from '../utils/logger'

/** Output dimensionality of Xenova/multilingual-e5-small — verified empirically, not documented in one obvious place. */
export const EMBEDDING_DIM = 384

/**
 * Cosine distance (1 - similarity) cutoff for the semantic arm. KNN always
 * returns its k nearest neighbors even when none are actually related to the
 * query — a raw `k = N` clause with no cutoff means every query, including
 * nonsense/gibberish input, "finds" something. This model doesn't cleanly
 * separate true matches from noise: empirically, real matches on this
 * project's content land anywhere from ~0.11 (strong, specific) to ~0.16
 * (weaker, thinner content) distance, and gibberish/unrelated queries land
 * ~0.18-0.20 — a genuinely narrow margin.
 *
 * **Confirmed cross-architecture ONNX numerical variance, not just theoretical
 * risk**: on production (aarch64) and local dev (arm64), a calibration script
 * measured gibberish at 0.175-0.195 distance and real matches at 0.12-0.155 —
 * 0.15 sits correctly between them. But GitHub Actions' CI runner (x64)
 * computes measurably different numbers for the exact same quantized model
 * and inputs, consistently landing *lower* (more "similar") than ARM — enough
 * to flip a true-positive from 0.148 (pass) to >0.15 (fail) in one direction,
 * and to push a gibberish query's distance below 0.15 in the other, each
 * confirmed by an actual CI failure (see tasks.md section 4 in
 * openspec/changes/archive/2026-08-10-add-semantic-search/). Raising the
 * threshold to fix one direction broke the other — there is no single value
 * that's safely CI-x64-compatible AND correctly calibrated for the ARM
 * architecture this app actually runs on. Resolution: keep this value tuned
 * for the real target platforms (confirmed correct there), and make any test
 * asserting exact semantic-arm behavior scope its assertions to the specific
 * entity under test rather than "zero/any results in total" — see
 * tests/integration/collaboration.test.ts's "FTS5 re-index" test for the
 * pattern. Revisit with real numbers from further production usage; a
 * weakly-worded genuine match sitting above this line and getting silently
 * dropped is a real, known risk.
 */
const SEMANTIC_MAX_DISTANCE = 0.15

const MODEL_ID = 'Xenova/multilingual-e5-small'

// transformers.js defaults cacheDir to a path relative to its own package
// inside node_modules, which `npm ci` wipes on every deploy. Point it at a
// project-root directory instead so `scripts/download-embedding-model.mjs`
// (run during CI, see deploy.yml) can vendor the model into the deploy
// artifact and it survives dependency reinstalls.
env.cacheDir = join(process.cwd(), 'models')

// In production, fail loudly on a missing vendored model rather than
// silently falling back to a first-request network download — the deploy
// server's egress isn't something this app should depend on at runtime.
if (process.env.NODE_ENV === 'production') {
  env.allowRemoteModels = false
}

/**
 * Rough character budget kept well under the model's ~512 token window.
 * Character-based, not token-based, to avoid a separate tokenizer pass just
 * to measure length — mixed Spanish/English prose averages well above 4
 * chars/token, so this stays safely under the limit rather than exactly at it.
 */
const MAX_INPUT_CHARS = 2000

let embedderPromise: Promise<FeatureExtractionPipeline> | null = null

function getEmbedder(): Promise<FeatureExtractionPipeline> {
  if (!embedderPromise) {
    embedderPromise = pipeline('feature-extraction', MODEL_ID, { dtype: 'q8' })
  }
  return embedderPromise
}

/**
 * Embed text with e5's required instruction prefix. e5 models are trained for
 * asymmetric retrieval: search queries and indexed passages are embedded
 * differently ("query: " vs "passage: "), which measurably improves ranking
 * over embedding both the same way (see openspec/changes/add-semantic-search).
 */
export async function embedText(text: string, kind: 'query' | 'passage'): Promise<Float32Array> {
  const extractor = await getEmbedder()
  const prefixed = `${kind}: ${text.slice(0, MAX_INPUT_CHARS)}`
  const output = await extractor(prefixed, { pooling: 'mean', normalize: true })
  return new Float32Array(output.data)
}

/**
 * The two role-scoped copies of the vector index, mirroring `FTS_TABLES` in search.ts —
 * same names, same split, same threshold, decided by the same `indexVariantForRole`.
 */
export const VEC_TABLES = {
  full: 'entity_vectors',
  filtered: 'entity_vectors_filtered',
} as const

/**
 * Load the sqlite-vec extension and create the vector table + id-mapping
 * table. Deliberately NOT a Drizzle migration: vec0 is a virtual table
 * backed by a loadable extension, so the CREATE VIRTUAL TABLE statement only
 * parses after sqliteVec.load() has run on this connection — a plain .sql
 * migration file has no way to do that. Same startup-init pattern as
 * initFTS5() in search.ts, for the same reason.
 *
 * campaign_id is a partition key: sqlite-vec restricts each KNN scan to rows
 * sharing the queried value, keeping per-campaign search fast as the corpus
 * across all campaigns grows.
 */
export function initVecTable(sqlite: Database.Database): { needsFilteredBackfill: boolean } {
  sqliteVec.load(sqlite)

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS entity_vec_map (
      rowid INTEGER PRIMARY KEY AUTOINCREMENT,
      entity_id TEXT NOT NULL UNIQUE
    );
  `)
  for (const table of Object.values(VEC_TABLES)) {
    sqlite.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS ${table} USING vec0(
        campaign_id TEXT partition key,
        embedding float[${EMBEDDING_DIM}] distance_metric=cosine
      );
    `)
  }

  return { needsFilteredBackfill: countMissingFilteredVectors(sqlite) > 0 }
}

/** How many embedded entities have no filtered vector yet. Zero once the migration is done. */
export function countMissingFilteredVectors(sqlite: Database.Database): number {
  return (
    sqlite
      .prepare(
        `SELECT COUNT(*) AS n FROM ${VEC_TABLES.full}
         WHERE rowid NOT IN (SELECT rowid FROM ${VEC_TABLES.filtered})`,
      )
      .get() as { n: number }
  ).n
}

/**
 * The text an entity's vector was built from, read out of the LEXICAL index rather than off
 * disk.
 *
 * Every call site pairs `indexEntity(..., name, aliases, tags, body)` with
 * `indexEntityEmbedding(..., name, body)` on the same two values, so `entities_fts.name` /
 * `entities_fts.body` ARE the text that produced the stored vector, and
 * `entities_fts_filtered.body` is already the `stripSecretBlocks` of it — computed by the
 * lexical migration, which `server/plugins/watcher.ts` completes synchronously before this
 * ever runs.
 *
 * This is not merely cheaper than reading the file; it is the only source that is reliably
 * THERE. `entities.file_path` holds an absolute path recorded on whichever host wrote the
 * row (`/var/www/aleph/content/...` in this project's database), so a copy of the database
 * opened anywhere else resolves none of them — measured here: 4,507 of 4,601 entities carry
 * a path no local file answers to. It is also what the spec asks for in as many words: the
 * rebuild "SHALL NOT be reconstructed from the filesystem when the stored index already
 * holds the same text".
 */
function storedIndexTextLookup(sqlite: Database.Database) {
  const stmt = sqlite.prepare(`
    SELECT f.name AS name, f.body AS body, g.body AS filteredBody
    FROM entities_fts_map m
    JOIN ${FTS_TABLES.full} f ON f.rowid = m.rowid
    JOIN ${FTS_TABLES.filtered} g ON g.rowid = m.rowid
    WHERE m.entity_id = ?
  `)
  return (entityId: string) =>
    stmt.get(entityId) as { name: string; body: string; filteredBody: string } | undefined
}

/**
 * Give every already-embedded entity its filtered vector, WITHOUT re-embedding the ones that
 * do not need it.
 *
 * The naive migration — drop the vector table and let the boot backfill regenerate it — was
 * measured on this project's own database: 1,495 entities at ~284 ms per embedding is **~7
 * minutes**, and `server/plugins/watcher.ts` `await`s the backfill before Nitro serves. That
 * is a live campaign's site down for seven minutes to fix a search bug.
 *
 * Almost none of that work is real. `stripSecretBlocks` is a no-op on a body with no secret
 * block, and in this corpus that is the overwhelming majority — so for those the filtered
 * vector is BIT-IDENTICAL to the one already stored, and copying the blob is exact, not an
 * approximation. Only an entity that actually carries a block gets a second forward pass.
 *
 * **It fails CLOSED.** An entity whose source text cannot be recovered is LEFT OUT of the
 * filtered table and counted, never given the full vector as a stand-in. The first draft did
 * the opposite — `source === null` fell into the same branch as "nothing was stripped" and
 * copied the unfiltered vector — which hands a player's semantic arm an embedding of the
 * secret text and is precisely the leak this change exists to close. Skipping costs a player
 * some semantic reach on that one sheet; the alternative costs the Narrator the secret. The
 * skipped rows keep `countMissingFilteredVectors` above zero, so the next boot tries again
 * and the parity guard reports them meanwhile.
 */
export async function backfillFilteredVectors(
  sqlite: Database.Database,
  bodyForEntityId: (entityId: string) => Promise<{ name: string; body: string } | null>,
): Promise<{ copied: number; reEmbedded: number; skipped: number; failed: number }> {
  const result = { copied: 0, reEmbedded: 0, skipped: 0, failed: 0 }
  const storedText = storedIndexTextLookup(sqlite)

  const missing = sqlite
    .prepare(
      `SELECT v.rowid AS rowid, v.campaign_id AS campaignId, m.entity_id AS entityId
       FROM ${VEC_TABLES.full} v
       JOIN entity_vec_map m ON m.rowid = v.rowid
       WHERE v.rowid NOT IN (SELECT rowid FROM ${VEC_TABLES.filtered})`,
    )
    .all() as Array<{ rowid: number; campaignId: string; entityId: string }>

  const insert = sqlite.prepare(
    `INSERT INTO ${VEC_TABLES.filtered} (rowid, campaign_id, embedding) VALUES (?, ?, ?)`,
  )

  for (const row of missing) {
    try {
      // The lexical index first — it is stored text, always present, and already filtered.
      // The injected filesystem lookup is the fallback for an entity the lexical index does
      // not know about (embedded but never FTS-indexed).
      const indexed = storedText(row.entityId)
      let name: string
      let body: string
      let filtered: string
      if (indexed) {
        ;({ name, body } = indexed)
        filtered = indexed.filteredBody
      } else {
        const source = await bodyForEntityId(row.entityId)
        if (source === null) {
          // Neither source can say what this entity's text is, so there is no way to know
          // whether its vector encodes a secret. Leave it out. See the fail-closed note above.
          result.skipped++
          logger.warn('No source text for a filtered vector; leaving the entity out of it', {
            entityId: row.entityId,
          })
          continue
        }
        ;({ name, body } = source)
        filtered = stripSecretBlocks(body, FILTERED_INDEX_ROLE)
      }

      if (filtered === body) {
        // Nothing was stripped, so the filtered text IS the text that produced the stored
        // vector. Copy the blob rather than recompute it.
        const existing = sqlite
          .prepare(`SELECT embedding FROM ${VEC_TABLES.full} WHERE rowid = ?`)
          .get(row.rowid) as { embedding: Uint8Array }
        insert.run(BigInt(row.rowid), row.campaignId, existing.embedding)
        result.copied++
      } else {
        const vector = await embedText(`${name}\n${filtered}`, 'passage')
        insert.run(BigInt(row.rowid), row.campaignId, vector)
        result.reEmbedded++
      }
    } catch (error) {
      result.failed++
      // The message, not just the code: a bare `{"code":"SQLITE_ERROR"}` is what this
      // logged the first time it went wrong, and it said nothing about why.
      logger.error('Failed to backfill filtered vector', {
        entityId: row.entityId,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  return result
}

/**
 * Compute and upsert an entity's embedding. Upserts by entity_id, mirroring
 * indexEntity()'s delete-then-insert pattern (vec0, like FTS5, has no UPDATE).
 */
export async function indexEntityEmbedding(
  sqlite: Database.Database,
  entityId: string,
  campaignId: string,
  name: string,
  body: string,
): Promise<void> {
  const filteredBody = stripSecretBlocks(body, FILTERED_INDEX_ROLE)

  // ONE pass over ONE entity, like indexEntity(). The second embedding is computed only
  // when the filtered text actually differs — most sheets carry no secret block at all, so
  // the common case costs exactly what it did before.
  const fullVector = await embedText(`${name}\n${body}`, 'passage')
  const vectorByVariant: Record<IndexVariant, Float32Array> =
    filteredBody === body
      ? { full: fullVector, filtered: fullVector }
      : { full: fullVector, filtered: await embedText(`${name}\n${filteredBody}`, 'passage') }

  const existing = sqlite
    .prepare('SELECT rowid FROM entity_vec_map WHERE entity_id = ?')
    .get(entityId) as { rowid: number } | undefined

  const rowid = existing
    ? existing.rowid
    : Number(
        sqlite.prepare('INSERT INTO entity_vec_map (entity_id) VALUES (?)').run(entityId)
          .lastInsertRowid,
      )

  const write = sqlite.transaction(() => {
    for (const [variant, table] of Object.entries(VEC_TABLES) as Array<[IndexVariant, string]>) {
      if (existing) sqlite.prepare(`DELETE FROM ${table} WHERE rowid = ?`).run(rowid)
      // vec0 requires the rowid bound strictly as an SQLite INTEGER; better-sqlite3
      // only guarantees that for BigInt binds (see sqlite-vec's own Node examples).
      sqlite
        .prepare(`INSERT INTO ${table} (rowid, campaign_id, embedding) VALUES (?, ?, ?)`)
        .run(BigInt(rowid), campaignId, vectorByVariant[variant])
    }
  })
  write()
}

/**
 * Remove an entity's embedding and its id-mapping row.
 */
export function removeEntityEmbedding(sqlite: Database.Database, entityId: string): void {
  const existing = sqlite
    .prepare('SELECT rowid FROM entity_vec_map WHERE entity_id = ?')
    .get(entityId) as { rowid: number } | undefined

  if (existing) {
    const drop = sqlite.transaction(() => {
      for (const table of Object.values(VEC_TABLES)) {
        sqlite.prepare(`DELETE FROM ${table} WHERE rowid = ?`).run(existing.rowid)
      }
      sqlite.prepare('DELETE FROM entity_vec_map WHERE entity_id = ?').run(entityId)
    })
    drop()
  }
}

/**
 * The vector half of the divergence guard — see `findIndexParityGaps` in search.ts.
 * Same contract: the SET of entities must be identical, their contents need not be.
 */
export function findVectorParityGaps(sqlite: Database.Database): string[] {
  const problems: string[] = []
  const mapped = new Set(
    (sqlite.prepare('SELECT rowid FROM entity_vec_map').all() as Array<{ rowid: number }>).map(
      (r) => r.rowid,
    ),
  )
  for (const table of Object.values(VEC_TABLES)) {
    const rowids = new Set(
      (sqlite.prepare(`SELECT rowid FROM ${table}`).all() as Array<{ rowid: number }>).map(
        (r) => r.rowid,
      ),
    )
    const missing = [...mapped].filter((r) => !rowids.has(r))
    const extra = [...rowids].filter((r) => !mapped.has(r))
    if (missing.length) problems.push(`${table} is missing ${missing.length} embedded entities`)
    if (extra.length) problems.push(`${table} holds ${extra.length} vectors with no mapping`)
  }
  return problems
}

export interface SemanticResult {
  entityId: string
  distance: number
}

/**
 * Semantic KNN search scoped to a campaign. Queries the vec0 table for
 * rowid/distance only, then resolves rowids to entity ids separately —
 * mirrors searchEntitiesFuzzy()'s two-step approach in search.ts, avoiding
 * reliance on join support inside a MATCH/k= KNN query.
 */
export async function searchEntitiesSemantic(
  sqlite: Database.Database,
  campaignId: string,
  query: string,
  limit: number,
  role: string = 'visitor',
): Promise<SemanticResult[]> {
  if (!query.trim() || limit <= 0) return []

  // Same fail-closed default as searchEntities(): a caller that forgets the role loses the
  // Narrator's reach, not a player's secrets.
  const table = VEC_TABLES[indexVariantForRole(role)]

  const vector = await embedText(query, 'query')
  const rows = sqlite
    .prepare(
      `
      SELECT rowid, distance
      FROM ${table}
      WHERE embedding MATCH ? AND campaign_id = ? AND k = ?
      ORDER BY distance
    `,
    )
    .all(vector, campaignId, limit) as Array<{ rowid: number; distance: number }>

  const relevantRows = rows.filter((r) => r.distance <= SEMANTIC_MAX_DISTANCE)
  if (relevantRows.length === 0) return []

  const placeholders = relevantRows.map(() => '?').join(',')
  const idRows = sqlite
    .prepare(
      `SELECT rowid, entity_id as entityId FROM entity_vec_map WHERE rowid IN (${placeholders})`,
    )
    .all(...relevantRows.map((r) => r.rowid)) as Array<{ rowid: number; entityId: string }>

  const entityIdByRowid = new Map(idRows.map((r) => [r.rowid, r.entityId]))

  return relevantRows
    .map((r) => ({ entityId: entityIdByRowid.get(r.rowid), distance: r.distance }))
    .filter((r): r is SemanticResult => r.entityId !== undefined)
}
