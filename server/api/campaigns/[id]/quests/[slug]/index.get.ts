import { eq, and } from 'drizzle-orm'
import { useDb } from '../../../../../utils/db'
import { quests, subCampaigns } from '../../../../../db/schema/sessions'
import { stripSecretBlocks } from '../../../../../services/content'
import { hasMinRole } from '../../../../../utils/permissions'
import type { CampaignRole } from '../../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const campaignId = getRouterParam(event, 'id')!
  const slug = getRouterParam(event, 'slug')!
  const db = useDb()
  const actualRole = (event.context.campaignRole || 'visitor') as CampaignRole
  const userId = event.context.user?.id

  const previewAs = getQuery(event).preview_as as string | undefined
  let role = actualRole
  if (previewAs && hasMinRole(actualRole, 'co_dm')) {
    const validRoles: CampaignRole[] = ['dm', 'co_dm', 'editor', 'player', 'visitor']
    if (validRoles.includes(previewAs as CampaignRole)) {
      role = previewAs as CampaignRole
    }
  }

  // Was the raw row: it carried `subCampaignId` and no name, so the detail page could only
  // print an id. Joined here for the same reason the list is, and so that the list and the
  // detail agree on which fields exist.
  const row = db
    .select({
      quest: quests,
      subCampaignName: subCampaigns.name,
      subCampaignSlug: subCampaigns.slug,
    })
    .from(quests)
    .innerJoin(subCampaigns, eq(quests.subCampaignId, subCampaigns.id))
    .where(and(eq(quests.campaignId, campaignId), eq(quests.slug, slug)))
    .get()

  if (!row) throw createError({ statusCode: 404, message: 'Quest not found' })
  const quest = row.quest

  return {
    ...quest,
    subCampaignName: row.subCampaignName,
    subCampaignSlug: row.subCampaignSlug,
    description: quest.description
      ? stripSecretBlocks(quest.description, role, userId)
      : quest.description,
  }
})
