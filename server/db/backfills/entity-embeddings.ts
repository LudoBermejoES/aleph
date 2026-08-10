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
  failed: number
}

const LOG_INTERVAL = 50

/**
 * Generate embeddings for every entity that doesn't have one yet — the
 * one-time migration path for entities created before semantic search
 * existed (see openspec/changes/add-semantic-search).
 *
 * Idempotent (skips any entity id already present in `entity_vec_map`) and
 * resumable — safe to interrupt (e.g. a deploy restart mid-run) and re-run,
 * since it just picks up wherever it left off. Called from
 * `server/plugins/watcher.ts` right after `initVecTable()`, on every boot,
 * the same convention the other filesystem-touching backfills in
 * `server/db/backfills/` use via `server/plugins/migrations.ts` — after the
 * first full pass this is a fast per-entity existence check, not a rescan.
 */
export async function backfillEntityEmbeddings(
  db: BetterSQLite3Database,
  sqlite: Database.Database,
): Promise<BackfillResult> {
  const result: BackfillResult = { migrated: 0, skippedExisting: 0, skippedNoFile: 0, failed: 0 }

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

  for (const row of rows) {
    if (alreadyEmbeddedStmt.get(row.id)) {
      result.skippedExisting++
      continue
    }

    if (!row.filePath) {
      result.skippedNoFile++
      continue
    }

    try {
      const { content } = await readEntityFile(row.filePath)
      await indexEntityEmbedding(sqlite, row.id, row.campaignId, row.name, content)
      result.migrated++
    } catch (error) {
      result.failed++
      logger.error('Failed to backfill embedding for entity', { entityId: row.id, error })
    }

    const processed = result.migrated + result.failed
    if (processed > 0 && processed % LOG_INTERVAL === 0) {
      logger.info('Embedding backfill progress', { ...result, total: rows.length })
    }
  }

  return result
}
