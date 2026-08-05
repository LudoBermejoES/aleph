import { eq, and } from 'drizzle-orm'
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import { campaigns } from '../schema/campaigns'
import { entities } from '../schema/entities'
import { arcs } from '../schema/sessions'
import { logger } from '../../utils/logger'

export interface BackfillResult {
  migrated: number
  skippedExisting: number
}

/**
 * Give every arc a mirror row in `entities` (reusing `arcs.id` as `entities.id`, the same
 * shared-id pattern `organizations`/`quests`/sessions already use) so it resolves through the
 * generic entity lookup and can participate in the relation graph.
 *
 * Arcs have neither a backing `.md` file nor their own `createdAt`/`updatedAt` columns (unlike
 * quests/sessions), so the mirror entity gets `filePath: ''` and the current time — see
 * `openspec/changes/archive/*-relatable-sessions-arcs/design.md` for why that's an accepted,
 * cosmetic-only inaccuracy.
 *
 * Idempotent — an arc whose id already has an `entities` row is skipped, so this is safe to
 * run on every boot alongside the other backfills in `server/plugins/migrations.ts`.
 */
export async function backfillArcEntities(db: BetterSQLite3Database): Promise<BackfillResult> {
  const result: BackfillResult = { migrated: 0, skippedExisting: 0 }

  const rows = db
    .select({
      id: arcs.id,
      campaignId: arcs.campaignId,
      name: arcs.name,
      slug: arcs.slug,
      campaignCreatedBy: campaigns.createdBy,
    })
    .from(arcs)
    .innerJoin(campaigns, eq(arcs.campaignId, campaigns.id))
    .all()

  for (const row of rows) {
    // Every arc is a candidate — most have already been mirrored by a previous boot, so this
    // check is the common case, not a rare defensive one.
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

    const now = new Date()
    db.insert(entities)
      .values({
        id: row.id,
        campaignId: row.campaignId,
        type: 'arc',
        name: row.name,
        slug: entitySlug,
        filePath: '',
        visibility: 'members',
        createdBy: row.campaignCreatedBy,
        createdAt: now,
        updatedAt: now,
      })
      .run()

    result.migrated++
  }

  if (result.migrated > 0) {
    logger.info('Backfilled arc mirror entities', result)
  }

  return result
}
