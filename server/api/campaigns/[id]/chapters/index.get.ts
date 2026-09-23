import { and, asc, eq } from 'drizzle-orm'
import { useDb } from '../../../../utils/db'
import { arcs, chapters, subCampaigns } from '../../../../db/schema/sessions'

/**
 * Chapters of the campaign, optionally narrowed by arc or by sub-campaign.
 *
 * Three things changed here, and the first two were bugs rather than gaps:
 *
 * 1. `arc_id` was REQUIRED (a hard 400) and, worse, never scoped to the route's campaign — it
 *    filtered `chapters.arcId` alone, so `/campaigns/A/chapters?arc_id=<an arc of B>` handed back
 *    campaign B's chapters. Now every query joins through `arcs` and filters on
 *    `arcs.campaignId`, the same shape `server/utils/arc-chapter.ts` already uses and documents.
 * 2. Listing every chapter of a campaign was impossible, which is why `aleph chapter list` walks
 *    `/arcs` instead of using this endpoint.
 * 3. A chapter's sub-campaign is DERIVED through its arc — never stored on `chapters`, so the two
 *    can never disagree — and is projected here by name and slug, not as a bare id.
 *
 * An unknown `subCampaignSlug` returns an empty list rather than an error, matching the read
 * behaviour of the arc, quest and session filters.
 */
export default defineEventHandler(async (event) => {
  const campaignId = getRouterParam(event, 'id')!
  const query = getQuery(event)
  const arcId = query.arc_id as string | undefined
  const subCampaignSlug = query.subCampaignSlug as string | undefined

  const db = useDb()
  const filters = [eq(arcs.campaignId, campaignId)]
  if (arcId) filters.push(eq(chapters.arcId, arcId))
  if (subCampaignSlug) filters.push(eq(subCampaigns.slug, subCampaignSlug))

  return db
    .select({
      id: chapters.id,
      arcId: chapters.arcId,
      name: chapters.name,
      slug: chapters.slug,
      description: chapters.description,
      sortOrder: chapters.sortOrder,
      arcName: arcs.name,
      arcSlug: arcs.slug,
      subCampaignId: arcs.subCampaignId,
      subCampaignName: subCampaigns.name,
      subCampaignSlug: subCampaigns.slug,
    })
    .from(chapters)
    .innerJoin(arcs, eq(chapters.arcId, arcs.id))
    .innerJoin(subCampaigns, eq(arcs.subCampaignId, subCampaigns.id))
    .where(and(...filters))
    .orderBy(asc(arcs.sortOrder), asc(chapters.sortOrder))
    .all()
})
