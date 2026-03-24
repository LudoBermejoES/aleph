import { eq } from 'drizzle-orm'
import { useDb } from '../../../../utils/db'
import { shops } from '../../../../db/schema/inventory'

export default defineEventHandler(async (event) => {
  const campaignId = getRouterParam(event, 'id')!
  const db = useDb()
  return db.select().from(shops).where(eq(shops.campaignId, campaignId)).all()
})
