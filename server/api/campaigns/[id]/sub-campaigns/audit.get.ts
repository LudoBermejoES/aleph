import { and, eq, ne, asc } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import { useDb } from '../../../../utils/db'
import { arcs, gameSessions, subCampaigns } from '../../../../db/schema/sessions'

/**
 * Sessions whose arc belongs to a different sub-campaign than the session itself.
 *
 * This state has been reachable since sub-campaigns shipped: `resolveArcChapterSlugs` scopes
 * arc/chapter lookups by `campaignId` and never reads `subCampaignId`, and `arc update
 * --subcampaign` moves an arc without touching the sessions hanging off it. Two independent
 * FKs, nothing comparing them.
 *
 * It is READ-ONLY on purpose, and ships before the 422 that closes the hole: if production
 * already holds incoherent rows, the refusal would turn edits that used to work into errors,
 * and the Narrator deserves to see the list first. The repair lives in the sibling
 * `audit-fix.post.ts` so that no GET can ever mutate.
 */
export default defineEventHandler(async (event) => {
  const campaignId = getRouterParam(event, 'id')!
  const db = useDb()

  const sessionSub = alias(subCampaigns, 'session_sub')
  const arcSub = alias(subCampaigns, 'arc_sub')

  const rows = db
    .select({
      sessionSlug: gameSessions.slug,
      sessionTitle: gameSessions.title,
      sessionNumber: gameSessions.sessionNumber,
      arcSlug: arcs.slug,
      arcName: arcs.name,
      sessionSubCampaignSlug: sessionSub.slug,
      sessionSubCampaignName: sessionSub.name,
      arcSubCampaignSlug: arcSub.slug,
      arcSubCampaignName: arcSub.name,
    })
    .from(gameSessions)
    // An inner join: a session with no arc has nothing to disagree with.
    .innerJoin(arcs, eq(gameSessions.arcId, arcs.id))
    .innerJoin(sessionSub, eq(gameSessions.subCampaignId, sessionSub.id))
    .innerJoin(arcSub, eq(arcs.subCampaignId, arcSub.id))
    .where(
      and(
        eq(gameSessions.campaignId, campaignId),
        ne(gameSessions.subCampaignId, arcs.subCampaignId),
      ),
    )
    .orderBy(asc(gameSessions.sessionNumber))
    .all()

  return { incoherent: rows, total: rows.length }
})
