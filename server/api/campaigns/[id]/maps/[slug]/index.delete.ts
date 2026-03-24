import { eq, and } from 'drizzle-orm'
import { useDb } from '../../../../../utils/db'
import { maps } from '../../../../../db/schema/maps'
import { hasMinRole } from '../../../../../utils/permissions'
import type { CampaignRole } from '../../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const role = event.context.campaignRole as CampaignRole
  if (!hasMinRole(role, 'co_dm')) throw createError({ statusCode: 403, message: 'Co-DM or above can delete maps' })

  const campaignId = getRouterParam(event, 'id')!
  const slug = getRouterParam(event, 'slug')!
  const db = useDb()

  const map = db.select().from(maps).where(and(eq(maps.campaignId, campaignId), eq(maps.slug, slug))).get()
  if (!map) throw createError({ statusCode: 404, message: 'Map not found' })

  db.delete(maps).where(eq(maps.id, map.id)).run()
  return { success: true }
})
