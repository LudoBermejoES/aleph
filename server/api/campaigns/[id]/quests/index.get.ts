import { eq } from 'drizzle-orm'
import { useDb } from '../../../../utils/db'
import { quests } from '../../../../db/schema/sessions'
import { hasMinRole } from '../../../../utils/permissions'
import type { CampaignRole } from '../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const campaignId = getRouterParam(event, 'id')!
  const role = event.context.campaignRole as CampaignRole
  const db = useDb()

  let results = db.select().from(quests)
    .where(eq(quests.campaignId, campaignId))
    .all()

  // Filter secret quests for non-DM
  if (!hasMinRole(role, 'co_dm')) {
    results = results.filter(q => !q.isSecret)
  }

  const query = getQuery(event)
  if (query.status) results = results.filter(q => q.status === query.status)

  return results
})
