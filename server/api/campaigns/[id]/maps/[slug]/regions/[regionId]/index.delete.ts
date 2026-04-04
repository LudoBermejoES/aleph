import { eq, and } from 'drizzle-orm'
import { useDb } from '../../../../../../../utils/db'
import { maps, mapRegions } from '../../../../../../../db/schema/maps'
import { hasMinRole } from '../../../../../../../utils/permissions'
import type { CampaignRole } from '../../../../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const role = event.context.campaignRole as CampaignRole
  if (!hasMinRole(role, 'co_dm')) throw createError({ statusCode: 403, message: 'Co-DM or above can delete map regions' })

  const campaignId = getRouterParam(event, 'id')!
  const slug = getRouterParam(event, 'slug')!
  const regionId = getRouterParam(event, 'regionId')!
  const db = useDb()

  const map = db.select().from(maps)
    .where(and(eq(maps.campaignId, campaignId), eq(maps.slug, slug)))
    .get()
  if (!map) throw createError({ statusCode: 404, message: 'Map not found' })

  const region = db.select().from(mapRegions).where(eq(mapRegions.id, regionId)).get()
  if (!region || region.mapId !== map.id) throw createError({ statusCode: 404, message: 'Region not found' })

  db.delete(mapRegions).where(eq(mapRegions.id, regionId)).run()

  return { success: true }
})
