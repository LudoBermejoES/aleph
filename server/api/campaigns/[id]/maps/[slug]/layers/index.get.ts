import { eq } from 'drizzle-orm'
import { useDb } from '../../../../../../utils/db'
import { mapLayers } from '../../../../../../db/schema/maps'
import { getMapForRole } from '../../../../../../services/maps'
import type { CampaignRole } from '../../../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const campaignId = getRouterParam(event, 'id')!
  const slug = getRouterParam(event, 'slug')!
  const role = (event.context.campaignRole || 'visitor') as CampaignRole
  const db = useDb()

  const map = getMapForRole(db, campaignId, slug, role)
  if (!map) throw createError({ statusCode: 404, message: 'Map not found' })

  return db
    .select()
    .from(mapLayers)
    .where(eq(mapLayers.mapId, map.id))
    .orderBy(mapLayers.sortOrder)
    .all()
})
