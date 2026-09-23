import { and, eq } from 'drizzle-orm'
import { useDb } from '../../../../utils/db'
import { quests, subCampaigns } from '../../../../db/schema/sessions'
import { filterSecretQuests } from '../../../../services/sessions'
import { stripSecretBlocks } from '../../../../services/content'
import { hasMinRole } from '../../../../utils/permissions'
import { resolveSubCampaignSlug } from '../../../../utils/sub-campaign'
import type { CampaignRole } from '../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const campaignId = getRouterParam(event, 'id')!
  const actualRole = event.context.campaignRole as CampaignRole
  const userId = event.context.user?.id
  const db = useDb()

  const previewAs = getQuery(event).preview_as as string | undefined
  let role = actualRole
  if (previewAs && hasMinRole(actualRole, 'co_dm')) {
    const validRoles: CampaignRole[] = ['dm', 'co_dm', 'editor', 'player', 'visitor']
    if (validRoles.includes(previewAs as CampaignRole)) {
      role = previewAs as CampaignRole
    }
  }

  const subCampaignSlug = getQuery(event).subCampaignSlug as string | undefined
  let subCampaignId: string | undefined
  if (subCampaignSlug) {
    try {
      subCampaignId = resolveSubCampaignSlug(db, campaignId, subCampaignSlug)
    } catch {
      return [] // unknown slug -> empty result, not an error
    }
  }

  const conditions = [eq(quests.campaignId, campaignId)]
  if (subCampaignId) conditions.push(eq(quests.subCampaignId, subCampaignId))

  // Joined so a row NAMES its sub-campaign rather than carrying a bare id: the list could
  // already be FILTERED by sub-campaign while never showing which one a quest belonged to.
  const allQuests = db
    .select({
      id: quests.id,
      campaignId: quests.campaignId,
      subCampaignId: quests.subCampaignId,
      name: quests.name,
      slug: quests.slug,
      description: quests.description,
      status: quests.status,
      parentQuestId: quests.parentQuestId,
      entityId: quests.entityId,
      isSecret: quests.isSecret,
      assignedCharacterIdsJson: quests.assignedCharacterIdsJson,
      logFilePath: quests.logFilePath,
      createdAt: quests.createdAt,
      updatedAt: quests.updatedAt,
      subCampaignName: subCampaigns.name,
      subCampaignSlug: subCampaigns.slug,
    })
    .from(quests)
    .innerJoin(subCampaigns, eq(quests.subCampaignId, subCampaigns.id))
    .where(and(...conditions))
    .all()

  let results = filterSecretQuests(allQuests, role)

  const query = getQuery(event)
  if (query.status) results = results.filter((q) => q.status === query.status)

  return results.map((q) => ({
    ...q,
    description: q.description ? stripSecretBlocks(q.description, role, userId) : q.description,
  }))
})
