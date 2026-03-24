import { eq, and } from 'drizzle-orm'
import { useDb } from '../../../../../../utils/db'
import { maps, mapLayers } from '../../../../../../db/schema/maps'

export default defineEventHandler(async (event) => {
  const campaignId = getRouterParam(event, 'id')!
  const slug = getRouterParam(event, 'slug')!
  const db = useDb()

  const map = db.select().from(maps).where(and(eq(maps.campaignId, campaignId), eq(maps.slug, slug))).get()
  if (!map) throw createError({ statusCode: 404, message: 'Map not found' })

  return db.select().from(mapLayers).where(eq(mapLayers.mapId, map.id)).orderBy(mapLayers.sortOrder).all()
})
