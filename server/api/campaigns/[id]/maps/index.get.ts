import { eq } from 'drizzle-orm'
import { useDb } from '../../../../utils/db'
import { maps } from '../../../../db/schema/maps'

export default defineEventHandler(async (event) => {
  const campaignId = getRouterParam(event, 'id')!
  const query = getQuery(event)
  const db = useDb()

  let results = db.select().from(maps)
    .where(eq(maps.campaignId, campaignId))
    .all()

  if (query.parent_map_id) {
    results = results.filter(m => m.parentMapId === query.parent_map_id)
  } else if (query.root === 'true') {
    results = results.filter(m => !m.parentMapId)
  }

  return results
})
