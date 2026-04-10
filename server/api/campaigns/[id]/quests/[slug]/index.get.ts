import { eq, and } from 'drizzle-orm'
import { useDb } from '../../../../../utils/db'
import { quests } from '../../../../../db/schema/sessions'
import { stripSecretBlocks } from '../../../../../services/content'
import { hasMinRole } from '../../../../../utils/permissions'
import type { CampaignRole } from '../../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const campaignId = getRouterParam(event, 'id')!
  const slug = getRouterParam(event, 'slug')!
  const db = useDb()
  const actualRole = (event.context.campaignRole || 'visitor') as CampaignRole

  const previewAs = getQuery(event).preview_as as string | undefined
  let role = actualRole
  if (previewAs && hasMinRole(actualRole, 'co_dm')) {
    const validRoles: CampaignRole[] = ['dm', 'co_dm', 'editor', 'player', 'visitor']
    if (validRoles.includes(previewAs as CampaignRole)) {
      role = previewAs as CampaignRole
    }
  }

  const quest = db
    .select()
    .from(quests)
    .where(and(eq(quests.campaignId, campaignId), eq(quests.slug, slug)))
    .get()

  if (!quest) throw createError({ statusCode: 404, message: 'Quest not found' })

  return {
    ...quest,
    description: quest.description ? stripSecretBlocks(quest.description, role) : quest.description,
  }
})
