import { eq, and } from 'drizzle-orm'
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import { campaigns } from '../schema/campaigns'
import { entities } from '../schema/entities'
import { gameSessions } from '../schema/sessions'
import { logger } from '../../utils/logger'

export interface BackfillResult {
  migrated: number
  skippedExisting: number
}

/**
 * Give every session a mirror row in `entities` (reusing `game_sessions.id` as `entities.id`,
 * the same shared-id pattern `organizations`/`quests` already use) so it resolves through the
 * generic entity lookup and can participate in the relation graph.
 *
 * Idempotent — a session whose id already has an `entities` row is skipped, so this is safe to
 * run on every boot alongside the other backfills in `server/plugins/migrations.ts`.
 */
export async function backfillSessionEntities(db: BetterSQLite3Database): Promise<BackfillResult> {
  const result: BackfillResult = { migrated: 0, skippedExisting: 0 }

  const rows = db
    .select({
      id: gameSessions.id,
      campaignId: gameSessions.campaignId,
      title: gameSessions.title,
      slug: gameSessions.slug,
      logFilePath: gameSessions.logFilePath,
      createdAt: gameSessions.createdAt,
      updatedAt: gameSessions.updatedAt,
      campaignCreatedBy: campaigns.createdBy,
    })
    .from(gameSessions)
    .innerJoin(campaigns, eq(gameSessions.campaignId, campaigns.id))
    .all()

  for (const row of rows) {
    // Every session is a candidate — most have already been mirrored by a previous boot, so
    // this check is the common case, not a rare defensive one.
    const alreadyMirrored = db
      .select({ id: entities.id })
      .from(entities)
      .where(eq(entities.id, row.id))
      .get()
    if (alreadyMirrored) {
      result.skippedExisting++
      continue
    }

    const slugTaken = db
      .select({ id: entities.id })
      .from(entities)
      .where(and(eq(entities.campaignId, row.campaignId), eq(entities.slug, row.slug)))
      .get()
    const entitySlug = slugTaken ? `${row.slug}-${Date.now().toString(36)}` : row.slug

    db.insert(entities)
      .values({
        id: row.id,
        campaignId: row.campaignId,
        type: 'session',
        name: row.title,
        slug: entitySlug,
        filePath: row.logFilePath || '',
        visibility: 'members',
        createdBy: row.campaignCreatedBy,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      })
      .run()

    result.migrated++
  }

  if (result.migrated > 0) {
    logger.info('Backfilled session mirror entities', result)
  }

  return result
}
