import { eq, and } from 'drizzle-orm'
import { useDb } from '../../../../../utils/db'
import { subCampaigns, arcs, quests, gameSessions } from '../../../../../db/schema/sessions'
import { hasMinRole } from '../../../../../utils/permissions'
import type { CampaignRole } from '../../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const role = event.context.campaignRole as CampaignRole
  if (!hasMinRole(role, 'co_dm')) {
    throw createError({ statusCode: 403, message: 'Co-DM or above can delete sub-campaigns' })
  }

  const campaignId = getRouterParam(event, 'id')!
  const slug = getRouterParam(event, 'slug')!
  const db = useDb()

  const target = db
    .select()
    .from(subCampaigns)
    .where(and(eq(subCampaigns.campaignId, campaignId), eq(subCampaigns.slug, slug)))
    .get()
  if (!target) throw createError({ statusCode: 404, message: 'Sub-campaign not found' })

  if (target.isDefault) {
    throw createError({
      statusCode: 422,
      message: 'The default sub-campaign cannot be deleted',
    })
  }

  const defaultSubCampaign = db
    .select({ id: subCampaigns.id })
    .from(subCampaigns)
    .where(and(eq(subCampaigns.campaignId, campaignId), eq(subCampaigns.isDefault, true)))
    .get()
  if (!defaultSubCampaign) {
    // Should never happen (every campaign is seeded with a default), but fail safe
    // rather than orphan the reassigned rows.
    throw createError({
      statusCode: 500,
      message: 'Campaign has no default sub-campaign to reassign content to',
    })
  }

  db.transaction((tx) => {
    tx.update(arcs)
      .set({ subCampaignId: defaultSubCampaign.id })
      .where(eq(arcs.subCampaignId, target.id))
      .run()
    tx.update(quests)
      .set({ subCampaignId: defaultSubCampaign.id })
      .where(eq(quests.subCampaignId, target.id))
      .run()
    tx.update(gameSessions)
      .set({ subCampaignId: defaultSubCampaign.id })
      .where(eq(gameSessions.subCampaignId, target.id))
      .run()

    tx.delete(subCampaigns).where(eq(subCampaigns.id, target.id)).run()
  })

  return { success: true }
})
