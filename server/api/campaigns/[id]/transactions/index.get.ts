import { eq, desc } from 'drizzle-orm'
import { useDb } from '../../../../utils/db'
import { transactions } from '../../../../db/schema/inventory'

export default defineEventHandler(async (event) => {
  const campaignId = getRouterParam(event, 'id')!
  const query = getQuery(event)
  const db = useDb()

  let results = db.select().from(transactions)
    .where(eq(transactions.campaignId, campaignId))
    .orderBy(desc(transactions.createdAt))
    .limit(100)
    .all()

  if (query.type) results = results.filter(t => t.type === query.type)
  if (query.entity_id) {
    const eid = query.entity_id as string
    results = results.filter(t => t.fromEntityId === eid || t.toEntityId === eid)
  }

  return results
})
