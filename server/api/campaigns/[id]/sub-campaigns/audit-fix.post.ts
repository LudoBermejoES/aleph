import { and, eq, ne, inArray } from 'drizzle-orm'
import { useDb } from '../../../../utils/db'
import { arcs, gameSessions } from '../../../../db/schema/sessions'
import { hasMinRole } from '../../../../utils/permissions'
import type { CampaignRole } from '../../../../utils/permissions'

/**
 * Repair for what `audit.get.ts` reports: each incoherent session adopts its ARC's sub-campaign.
 *
 * The arc wins because the arc is the organizing unit — the same reason moving an arc carries its
 * sessions. Deliberately a separate POST rather than a flag on the GET, so that no read can ever
 * mutate, and `co_dm` rather than `editor` because one call can rewrite many rows at once.
 */
export default defineEventHandler(async (event) => {
  const role = event.context.campaignRole as CampaignRole
  if (!hasMinRole(role, 'co_dm')) {
    throw createError({
      statusCode: 403,
      message: 'Co-DMs or above can repair sub-campaign incoherence',
    })
  }

  const campaignId = getRouterParam(event, 'id')!
  const db = useDb()

  const targets = db
    .select({ id: gameSessions.id, slug: gameSessions.slug, arcSubCampaignId: arcs.subCampaignId })
    .from(gameSessions)
    .innerJoin(arcs, eq(gameSessions.arcId, arcs.id))
    .where(
      and(
        eq(gameSessions.campaignId, campaignId),
        ne(gameSessions.subCampaignId, arcs.subCampaignId),
      ),
    )
    .all()

  if (targets.length === 0) return { repaired: [], total: 0 }

  // Grouped by destination so this is one UPDATE per sub-campaign rather than one per session,
  // and all of them inside a single transaction: a half-applied repair would leave the campaign
  // in a state neither the audit nor the Narrator could reason about.
  const byDestination = new Map<string, string[]>()
  for (const t of targets) {
    const list = byDestination.get(t.arcSubCampaignId) ?? []
    list.push(t.id)
    byDestination.set(t.arcSubCampaignId, list)
  }

  db.transaction((tx) => {
    for (const [subCampaignId, ids] of byDestination) {
      tx.update(gameSessions)
        .set({ subCampaignId, updatedAt: new Date() })
        .where(inArray(gameSessions.id, ids))
        .run()
    }
  })

  return { repaired: targets.map((t) => t.slug), total: targets.length }
})
