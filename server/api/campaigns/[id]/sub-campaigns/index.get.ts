import { eq, asc } from 'drizzle-orm'
import { useDb } from '../../../../utils/db'
import { subCampaigns } from '../../../../db/schema/sessions'

export default defineEventHandler(async (event) => {
  const campaignId = getRouterParam(event, 'id')!
  const db = useDb()

  return db
    .select()
    .from(subCampaigns)
    .where(eq(subCampaigns.campaignId, campaignId))
    .orderBy(asc(subCampaigns.sortOrder), asc(subCampaigns.name))
    .all()
})
