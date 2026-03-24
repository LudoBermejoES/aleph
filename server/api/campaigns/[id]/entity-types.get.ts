import { eq } from 'drizzle-orm'
import { useDb } from '../../../utils/db'
import { entityTypes } from '../../../db/schema/entity-types'

export default defineEventHandler(async (event) => {
  const campaignId = getRouterParam(event, 'id')!
  const db = useDb()

  return db.select().from(entityTypes)
    .where(eq(entityTypes.campaignId, campaignId))
    .orderBy(entityTypes.sortOrder)
    .all()
})
