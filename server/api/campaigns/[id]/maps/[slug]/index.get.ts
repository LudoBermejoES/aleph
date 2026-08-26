import { eq } from 'drizzle-orm'
import { useDb, useSqlite } from '../../../../../utils/db'
import { mapLayers, mapGroups, mapRegions } from '../../../../../db/schema/maps'
import {
  filterPinsByVisibility,
  computeBreadcrumb,
  getPinsWithEntity,
  getMapForRole,
} from '../../../../../services/maps'
import type { CampaignRole } from '../../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const campaignId = getRouterParam(event, 'id')!
  const slug = getRouterParam(event, 'slug')!
  const role = (event.context.campaignRole || 'visitor') as CampaignRole
  const userId = event.context.user?.id || ''
  const db = useDb()
  const sqlite = useSqlite()

  const map = getMapForRole(db, campaignId, slug, role)
  if (!map) throw createError({ statusCode: 404, message: 'Map not found' })

  const pins = await getPinsWithEntity(db, map.id, role, userId)
  const layers = db
    .select()
    .from(mapLayers)
    .where(eq(mapLayers.mapId, map.id))
    .orderBy(mapLayers.sortOrder)
    .all()
  const groups = db.select().from(mapGroups).where(eq(mapGroups.mapId, map.id)).all()
  const breadcrumb = computeBreadcrumb(sqlite, map.id)

  const regions = db.select().from(mapRegions).where(eq(mapRegions.mapId, map.id)).all()

  return {
    ...map,
    pins,
    layers,
    groups,
    regions: filterPinsByVisibility(regions, role),
    breadcrumb,
  }
})
