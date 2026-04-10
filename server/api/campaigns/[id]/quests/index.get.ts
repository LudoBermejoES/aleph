import { eq } from 'drizzle-orm'
import { useDb } from '../../../../utils/db'
import { quests } from '../../../../db/schema/sessions'
import { filterSecretQuests } from '../../../../services/sessions'
import { stripSecretBlocks } from '../../../../services/content'
import { hasMinRole } from '../../../../utils/permissions'
import type { CampaignRole } from '../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const campaignId = getRouterParam(event, 'id')!
  const actualRole = event.context.campaignRole as CampaignRole
  const db = useDb()

  const previewAs = getQuery(event).preview_as as string | undefined
  let role = actualRole
  if (previewAs && hasMinRole(actualRole, 'co_dm')) {
    const validRoles: CampaignRole[] = ['dm', 'co_dm', 'editor', 'player', 'visitor']
    if (validRoles.includes(previewAs as CampaignRole)) {
      role = previewAs as CampaignRole
    }
  }

  const allQuests = db.select().from(quests).where(eq(quests.campaignId, campaignId)).all()

  let results = filterSecretQuests(allQuests, role)

  const query = getQuery(event)
  if (query.status) results = results.filter((q) => q.status === query.status)

  return results.map((q) => ({
    ...q,
    description: q.description ? stripSecretBlocks(q.description, role) : q.description,
  }))
})
