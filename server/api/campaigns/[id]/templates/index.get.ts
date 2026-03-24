import { eq } from 'drizzle-orm'
import { useDb } from '../../../../utils/db'
import { entityTemplates } from '../../../../db/schema/entities'

export default defineEventHandler(async (event) => {
  const campaignId = getRouterParam(event, 'id')!
  const db = useDb()

  return db.select().from(entityTemplates)
    .where(eq(entityTemplates.campaignId, campaignId))
    .all()
})
