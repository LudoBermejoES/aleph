import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import type Database from 'better-sqlite3'
import { entities } from '../schema/entities'
import { organizations } from '../schema/organizations'
import { arcs, quests } from '../schema/sessions'
import { indexEntity } from '../../services/search'
import { readEntityFile } from '../../services/content'
import { logger } from '../../utils/logger'

export interface BackfillResult {
  migrated: number
  skippedExisting: number
  failed: number
}

const LOG_INTERVAL = 50

/**
 * Index every entity missing from the FTS5 lexical index. Historically, the
 * session/quest/arc "mirror entity" backfills (session-entities.ts,
 * quest-entities.ts, arc-entities.ts) and the organizations feature's
 * original Drizzle migration only ever inserted rows into the `entities`
 * table — none of them called indexEntity(), so entities of those types
 * were never findable via lexical search at all (only sometimes via the
 * semantic arm, and only when a query happened to clear its similarity
 * threshold). Confirmed on production: 224 sessions, 75 organizations, 14
 * arcs, and 14 quests were missing from entities_fts.
 *
 * Idempotent/resumable like the other backfills here — safe to run on every
 * boot. Sessions/quests already have a real content file via `filePath`
 * (mirrored from their `logFilePath`); organizations/arcs have no file, so
 * their `description` column is used as the body instead.
 */
export async function backfillEntityFtsIndex(
  db: BetterSQLite3Database,
  sqlite: Database.Database,
): Promise<BackfillResult> {
  const result: BackfillResult = { migrated: 0, skippedExisting: 0, failed: 0 }

  const rows = db
    .select({
      id: entities.id,
      campaignId: entities.campaignId,
      type: entities.type,
      name: entities.name,
      filePath: entities.filePath,
    })
    .from(entities)
    .all()

  const alreadyIndexedStmt = sqlite.prepare(
    'SELECT rowid FROM entities_fts_map WHERE entity_id = ?',
  )
  const candidates = rows.filter((r) => !alreadyIndexedStmt.get(r.id))
  result.skippedExisting = rows.length - candidates.length
  if (candidates.length === 0) return result

  // organizations/arcs store their body as a `description` column, not a
  // file — reuses the shared-id pattern (organizations.id === entities.id,
  // same for arcs/quests) the mirror-entity backfills already established.
  const orgDescById = new Map(
    db
      .select({ id: organizations.id, description: organizations.description })
      .from(organizations)
      .all()
      .map((r) => [r.id, r.description ?? '']),
  )
  const arcDescById = new Map(
    db
      .select({ id: arcs.id, description: arcs.description })
      .from(arcs)
      .all()
      .map((r) => [r.id, r.description ?? '']),
  )
  const questDescById = new Map(
    db
      .select({ id: quests.id, description: quests.description })
      .from(quests)
      .all()
      .map((r) => [r.id, r.description ?? '']),
  )

  for (const row of candidates) {
    try {
      let content = ''
      if (row.filePath) {
        try {
          content = (await readEntityFile(row.filePath)).content
        } catch {
          content = ''
        }
      }
      if (!content) {
        if (row.type === 'organization') content = orgDescById.get(row.id) ?? ''
        else if (row.type === 'arc') content = arcDescById.get(row.id) ?? ''
        else if (row.type === 'quest') content = questDescById.get(row.id) ?? ''
      }

      indexEntity(sqlite, row.id, row.campaignId, row.name, [], [], content)
      result.migrated++
    } catch (error) {
      result.failed++
      logger.error('Failed to backfill FTS index for entity', { entityId: row.id, error })
    }

    const processed = result.migrated + result.failed
    if (processed > 0 && processed % LOG_INTERVAL === 0) {
      logger.info('FTS index backfill progress', { ...result, total: rows.length })
    }
  }

  return result
}
