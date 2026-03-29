import { eq, asc } from 'drizzle-orm'
import { useDb } from '../../../../utils/db'
import { sessionGroups } from '../../../../db/schema/sessions'

export default defineEventHandler(async (event) => {
  const campaignId = getRouterParam(event, 'id')!
  const db = useDb()

  return db.select().from(sessionGroups)
    .where(eq(sessionGroups.campaignId, campaignId))
    .orderBy(asc(sessionGroups.sortOrder), asc(sessionGroups.name))
    .all()
})
