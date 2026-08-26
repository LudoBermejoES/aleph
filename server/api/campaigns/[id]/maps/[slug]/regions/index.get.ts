import { eq } from 'drizzle-orm'
import { useDb } from '../../../../../../utils/db'
import { mapRegions } from '../../../../../../db/schema/maps'
import { filterPinsByVisibility, getMapForRole } from '../../../../../../services/maps'
import type { CampaignRole } from '../../../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const campaignId = getRouterParam(event, 'id')!
  const slug = getRouterParam(event, 'slug')!
  const role = (event.context.campaignRole || 'visitor') as CampaignRole
  const db = useDb()

  const map = getMapForRole(db, campaignId, slug, role)
  if (!map) throw createError({ statusCode: 404, message: 'Map not found' })

  const regions = db.select().from(mapRegions).where(eq(mapRegions.mapId, map.id)).all()
  return filterPinsByVisibility(regions, role)
})
