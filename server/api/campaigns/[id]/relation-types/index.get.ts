import { eq } from 'drizzle-orm'
import { useDb } from '../../../../utils/db'
import { relationTypes } from '../../../../db/schema/relations'

export default defineEventHandler(async (event) => {
  const campaignId = getRouterParam(event, 'id')!
  const db = useDb()

  return db.select().from(relationTypes).where(eq(relationTypes.campaignId, campaignId)).all()
})
