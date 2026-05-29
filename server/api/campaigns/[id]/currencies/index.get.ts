import { eq } from 'drizzle-orm'
import { useDb } from '../../../../utils/db'
import { currencies } from '../../../../db/schema/inventory'

// Intentional raw array: currencies are small (<20 per campaign) and always fully loaded.
// CLI and composable consumers depend on array shape — do not paginate.
export default defineEventHandler(async (event) => {
  const campaignId = getRouterParam(event, 'id')!
  const db = useDb()
  return db
    .select()
    .from(currencies)
    .where(eq(currencies.campaignId, campaignId))
    .orderBy(currencies.sortOrder)
    .all()
})
