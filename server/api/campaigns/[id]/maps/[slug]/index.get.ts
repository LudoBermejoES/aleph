import { eq, and } from 'drizzle-orm'
import { useDb, useSqlite } from '../../../../../utils/db'
import { maps, mapPins, mapLayers, mapGroups } from '../../../../../db/schema/maps'
import { filterPinsByVisibility, computeBreadcrumb } from '../../../../../services/maps'
import type { CampaignRole } from '../../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const campaignId = getRouterParam(event, 'id')!
  const slug = getRouterParam(event, 'slug')!
  const role = (event.context.campaignRole || 'visitor') as CampaignRole
  const db = useDb()
  const sqlite = useSqlite()

  const map = db.select().from(maps)
    .where(and(eq(maps.campaignId, campaignId), eq(maps.slug, slug)))
    .get()
  if (!map) throw createError({ statusCode: 404, message: 'Map not found' })

  const pins = db.select().from(mapPins).where(eq(mapPins.mapId, map.id)).all()
  const layers = db.select().from(mapLayers).where(eq(mapLayers.mapId, map.id)).orderBy(mapLayers.sortOrder).all()
  const groups = db.select().from(mapGroups).where(eq(mapGroups.mapId, map.id)).all()
  const breadcrumb = computeBreadcrumb(sqlite, map.id)

  return {
    ...map,
    pins: filterPinsByVisibility(pins, role),
    layers,
    groups,
    breadcrumb,
  }
})
