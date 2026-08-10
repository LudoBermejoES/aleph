import type Database from 'better-sqlite3'
import * as sqliteVec from 'sqlite-vec'
import { pipeline, env, type FeatureExtractionPipeline } from '@huggingface/transformers'
import { join } from 'path'

/** Output dimensionality of Xenova/multilingual-e5-small — verified empirically, not documented in one obvious place. */
export const EMBEDDING_DIM = 384

/**
 * Cosine distance (1 - similarity) cutoff for the semantic arm. KNN always
 * returns its k nearest neighbors even when none are actually related to the
 * query — a raw `k = N` clause with no cutoff means every query, including
 * nonsense/gibberish input, "finds" something. This model doesn't cleanly
 * separate true matches from noise (empirically, real matches land around
 * 0.11-0.16 distance and unrelated/gibberish queries land around 0.18-0.20
 * against this project's content — see openspec/changes/add-semantic-search
 * tasks.md section 4), so this threshold is a best-effort heuristic, not a
 * rigorously calibrated boundary. Revisit after task 5.4's post-backfill
 * spot-check against real campaign content.
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
export function initVecTable(sqlite: Database.Database): void {
  sqliteVec.load(sqlite)
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS entity_vec_map (
      rowid INTEGER PRIMARY KEY AUTOINCREMENT,
      entity_id TEXT NOT NULL UNIQUE
    );

    CREATE VIRTUAL TABLE IF NOT EXISTS entity_vectors USING vec0(
      campaign_id TEXT partition key,
      embedding float[${EMBEDDING_DIM}] distance_metric=cosine
    );
  `)
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
  const vector = await embedText(`${name}\n${body}`, 'passage')

  const existing = sqlite
    .prepare('SELECT rowid FROM entity_vec_map WHERE entity_id = ?')
    .get(entityId) as { rowid: number } | undefined

  const rowid = existing
    ? existing.rowid
    : Number(
        sqlite.prepare('INSERT INTO entity_vec_map (entity_id) VALUES (?)').run(entityId)
          .lastInsertRowid,
      )

  if (existing) {
    sqlite.prepare('DELETE FROM entity_vectors WHERE rowid = ?').run(rowid)
  }
  // vec0 requires the rowid bound strictly as an SQLite INTEGER; better-sqlite3
  // only guarantees that for BigInt binds (see sqlite-vec's own Node examples).
  sqlite
    .prepare('INSERT INTO entity_vectors (rowid, campaign_id, embedding) VALUES (?, ?, ?)')
    .run(BigInt(rowid), campaignId, vector)
}

/**
 * Remove an entity's embedding and its id-mapping row.
 */
export function removeEntityEmbedding(sqlite: Database.Database, entityId: string): void {
  const existing = sqlite
    .prepare('SELECT rowid FROM entity_vec_map WHERE entity_id = ?')
    .get(entityId) as { rowid: number } | undefined

  if (existing) {
    sqlite.prepare('DELETE FROM entity_vectors WHERE rowid = ?').run(existing.rowid)
    sqlite.prepare('DELETE FROM entity_vec_map WHERE entity_id = ?').run(entityId)
  }
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
): Promise<SemanticResult[]> {
  if (!query.trim() || limit <= 0) return []

  const vector = await embedText(query, 'query')
  const rows = sqlite
    .prepare(
      `
      SELECT rowid, distance
      FROM entity_vectors
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
