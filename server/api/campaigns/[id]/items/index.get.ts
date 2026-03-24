import { eq } from 'drizzle-orm'
import { useDb } from '../../../../utils/db'
import { items } from '../../../../db/schema/inventory'

export default defineEventHandler(async (event) => {
  const campaignId = getRouterParam(event, 'id')!
  const query = getQuery(event)
  const db = useDb()

  let results = db.select().from(items).where(eq(items.campaignId, campaignId)).all()

  if (query.rarity) results = results.filter(i => i.rarity === query.rarity)
  if (query.type) results = results.filter(i => i.type === query.type)
  if (query.search) {
    const s = (query.search as string).toLowerCase()
    results = results.filter(i => i.name.toLowerCase().includes(s))
  }

  return results
})
