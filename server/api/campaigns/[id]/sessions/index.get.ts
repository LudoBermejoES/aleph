import { eq, desc } from 'drizzle-orm'
import { useDb } from '../../../../utils/db'
import { gameSessions } from '../../../../db/schema/sessions'

export default defineEventHandler(async (event) => {
  const campaignId = getRouterParam(event, 'id')!
  const query = getQuery(event)
  const db = useDb()

  let results = db.select().from(gameSessions)
    .where(eq(gameSessions.campaignId, campaignId))
    .orderBy(desc(gameSessions.sessionNumber))
    .all()

  const status = query.status as string | undefined
  if (status) results = results.filter(s => s.status === status)

  return results
})
