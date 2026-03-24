import { eq } from 'drizzle-orm'
import { useDb } from '../../../../utils/db'
import { quests } from '../../../../db/schema/sessions'
import { filterSecretQuests } from '../../../../services/sessions'
import type { CampaignRole } from '../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const campaignId = getRouterParam(event, 'id')!
  const role = event.context.campaignRole as CampaignRole
  const db = useDb()

  const allQuests = db.select().from(quests)
    .where(eq(quests.campaignId, campaignId))
    .all()

  let results = filterSecretQuests(allQuests, role)

  const query = getQuery(event)
  if (query.status) results = results.filter(q => q.status === query.status)

  return results
})
