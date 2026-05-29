import { eq } from 'drizzle-orm'
import { useDb } from '../../../utils/db'
import { tags } from '../../../db/schema/entities'

// Intentional raw array: tags are small reference data always loaded in full.
// CLI and composable consumers depend on array shape — do not paginate.
export default defineEventHandler(async (event) => {
  const campaignId = getRouterParam(event, 'id')!
  const db = useDb()

  return db.select().from(tags).where(eq(tags.campaignId, campaignId)).all()
})
