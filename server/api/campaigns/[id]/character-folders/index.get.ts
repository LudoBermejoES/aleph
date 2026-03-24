import { eq } from 'drizzle-orm'
import { useDb } from '../../../../utils/db'
import { characterFolders } from '../../../../db/schema/characters'

export default defineEventHandler(async (event) => {
  const campaignId = getRouterParam(event, 'id')!
  const db = useDb()

  return db.select().from(characterFolders)
    .where(eq(characterFolders.campaignId, campaignId))
    .orderBy(characterFolders.sortOrder)
    .all()
})
