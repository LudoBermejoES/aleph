import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import type Database from 'better-sqlite3'
import { entities } from '../schema/entities'
import { indexEntityEmbedding } from '../../services/embeddings'
import { readEntityFile } from '../../services/content'
import { logger } from '../../utils/logger'

export interface BackfillResult {
  migrated: number
  skippedExisting: number
  skippedNoFile: number
  /** Entities that failed on THIS run — they will be retried on the next boot. */
  failed: number
  /**
   * Entities not even attempted because they have already failed `MAX_ATTEMPTS` times.
   * Once this is the only non-zero counter left, the backfill has converged.
   */
  skippedFailedPermanently: number
}

const LOG_INTERVAL = 50

/**
 * How many boots an entity gets before the backfill gives up on it.
 *
 * Without a ceiling this backfill NEVER TERMINATES. An entity whose `filePath` points at a
 * file that no longer exists (`ENOENT entities/the-tavern.md` on this project's own database)
 * raises, is counted in `failed`, and is left with no `entity_vec_map` row — which is exactly
 * the condition that selects it again on the next boot, and the one after, forever. On a
 * database with a few such rows the effect is a permanent error log and a permanent unit of
 * boot work that can never be completed.
 *
 * Three, not one: a genuine transient (a file being rewritten as the pass walks past it, a
 * model load that lost a race with a shutdown) deserves another go, and three boots is cheap.
 *
 * To make the backfill retry an entity it has given up on -- after restoring the missing file,
 * say -- delete its row: `DELETE FROM entity_embedding_failures WHERE entity_id = '<id>'`.
 */
const MAX_ATTEMPTS = 3

/**
 * Bookkeeping for entities this backfill could not embed. Created here, in raw SQL, rather
 * than as a Drizzle migration, for the same reason `entity_vec_map` is: it belongs to the
 * embedding subsystem's own startup init, not to the application schema, and nothing outside
 * this file reads it.
 */
function initFailureTable(sqlite: Database.Database): void {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS entity_embedding_failures (
      entity_id TEXT PRIMARY KEY,
      attempts INTEGER NOT NULL DEFAULT 0,
      last_error TEXT,
      last_attempt_at TEXT NOT NULL
    );
  `)
}

/**
 * Generate embeddings for every entity that doesn't have one yet — the
 * one-time migration path for entities created before semantic search
 * existed (see openspec/changes/add-semantic-search).
 *
 * Idempotent (skips any entity id already present in `entity_vec_map`), resumable — safe to
 * interrupt (e.g. a deploy restart mid-run) and re-run, since it just picks up wherever it
 * left off — and CONVERGENT: an entity that keeps failing is retried at most `MAX_ATTEMPTS`
 * times across boots and then left alone, so a run eventually reports nothing to do instead of
 * re-failing the same rows on every start for ever. Called from
 * `server/plugins/watcher.ts` right after `initVecTable()`, on every boot,
 * the same convention the other filesystem-touching backfills in
 * `server/db/backfills/` use via `server/plugins/migrations.ts` — after the
 * first full pass this is a fast per-entity existence check, not a rescan.
 */
export async function backfillEntityEmbeddings(
  db: BetterSQLite3Database,
  sqlite: Database.Database,
): Promise<BackfillResult> {
  const result: BackfillResult = {
    migrated: 0,
    skippedExisting: 0,
    skippedNoFile: 0,
    failed: 0,
    skippedFailedPermanently: 0,
  }

  initFailureTable(sqlite)

  const rows = db
    .select({
      id: entities.id,
      campaignId: entities.campaignId,
      name: entities.name,
      filePath: entities.filePath,
    })
    .from(entities)
    .all()

  const alreadyEmbeddedStmt = sqlite.prepare('SELECT rowid FROM entity_vec_map WHERE entity_id = ?')
  const attemptsStmt = sqlite.prepare(
    'SELECT attempts FROM entity_embedding_failures WHERE entity_id = ?',
  )
  const recordFailureStmt = sqlite.prepare(
    `INSERT INTO entity_embedding_failures (entity_id, attempts, last_error, last_attempt_at)
     VALUES (?, 1, ?, ?)
     ON CONFLICT(entity_id) DO UPDATE SET
       attempts = attempts + 1,
       last_error = excluded.last_error,
       last_attempt_at = excluded.last_attempt_at`,
  )
  const clearFailureStmt = sqlite.prepare(
    'DELETE FROM entity_embedding_failures WHERE entity_id = ?',
  )

  for (const row of rows) {
    if (alreadyEmbeddedStmt.get(row.id)) {
      result.skippedExisting++
      // An entity that got embedded by any path (the watcher re-indexing an edit, a restored
      // file) has no business still carrying a failure record.
      clearFailureStmt.run(row.id)
      continue
    }

    if (!row.filePath) {
      result.skippedNoFile++
      continue
    }

    const previous = attemptsStmt.get(row.id) as { attempts: number } | undefined
    if (previous && previous.attempts >= MAX_ATTEMPTS) {
      result.skippedFailedPermanently++
      continue
    }

    try {
      const { content } = await readEntityFile(row.filePath)
      await indexEntityEmbedding(sqlite, row.id, row.campaignId, row.name, content)
      clearFailureStmt.run(row.id)
      result.migrated++
    } catch (error) {
      result.failed++
      recordFailureStmt.run(
        row.id,
        error instanceof Error ? error.message : String(error),
        new Date().toISOString(),
      )
      logger.error('Failed to backfill embedding for entity', { entityId: row.id, error })
    }

    const processed = result.migrated + result.failed
    if (processed > 0 && processed % LOG_INTERVAL === 0) {
      logger.info('Embedding backfill progress', { ...result, total: rows.length })
    }
  }

  return result
}
