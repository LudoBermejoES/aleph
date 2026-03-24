import { eq } from 'drizzle-orm'
import { useDb } from '../../../../utils/db'
import { currencies } from '../../../../db/schema/inventory'

export default defineEventHandler(async (event) => {
  const campaignId = getRouterParam(event, 'id')!
  const db = useDb()
  return db.select().from(currencies).where(eq(currencies.campaignId, campaignId)).orderBy(currencies.sortOrder).all()
})
