import { eq, and } from 'drizzle-orm'
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import { campaigns } from '../schema/campaigns'
import { entities } from '../schema/entities'
import { quests } from '../schema/sessions'
import { logger } from '../../utils/logger'

export interface BackfillResult {
  migrated: number
  skippedExisting: number
}

/**
 * Give every quest a mirror row in `entities` (reusing `quests.id` as `entities.id`, the same
 * shared-id pattern `organizations` already uses) so it resolves through the generic entity
 * lookup and can participate in the relation graph.
 *
 * Idempotent — a quest whose id already has an `entities` row is skipped, so this is safe to
 * run on every boot alongside the other backfills in `server/plugins/migrations.ts`.
 */
export async function backfillQuestEntities(db: BetterSQLite3Database): Promise<BackfillResult> {
  const result: BackfillResult = { migrated: 0, skippedExisting: 0 }

  const rows = db
    .select({
      id: quests.id,
      campaignId: quests.campaignId,
      name: quests.name,
      slug: quests.slug,
      isSecret: quests.isSecret,
      logFilePath: quests.logFilePath,
      createdAt: quests.createdAt,
      updatedAt: quests.updatedAt,
      campaignCreatedBy: campaigns.createdBy,
    })
    .from(quests)
    .innerJoin(campaigns, eq(quests.campaignId, campaigns.id))
    .all()

  for (const row of rows) {
    // Every quest is a candidate — most have already been mirrored by a previous boot, so
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
        type: 'quest',
        name: row.name,
        slug: entitySlug,
        filePath: row.logFilePath || '',
        visibility: row.isSecret ? 'dm_only' : 'members',
        createdBy: row.campaignCreatedBy,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      })
      .run()

    result.migrated++
  }

  if (result.migrated > 0) {
    logger.info('Backfilled quest mirror entities', result)
  }

  return result
}
