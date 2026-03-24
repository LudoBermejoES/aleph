import { eq, and } from 'drizzle-orm'
import { useDb } from '../../../../../../utils/db'
import { maps, mapPins } from '../../../../../../db/schema/maps'
import { filterPinsByVisibility } from '../../../../../../services/maps'
import type { CampaignRole } from '../../../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const campaignId = getRouterParam(event, 'id')!
  const slug = getRouterParam(event, 'slug')!
  const role = (event.context.campaignRole || 'visitor') as CampaignRole
  const db = useDb()

  const map = db.select().from(maps).where(and(eq(maps.campaignId, campaignId), eq(maps.slug, slug))).get()
  if (!map) throw createError({ statusCode: 404, message: 'Map not found' })

  const pins = db.select().from(mapPins).where(eq(mapPins.mapId, map.id)).all()
  return filterPinsByVisibility(pins, role)
})
