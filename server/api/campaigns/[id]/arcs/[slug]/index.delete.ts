import { eq, and } from 'drizzle-orm'
import { useDb } from '../../../../../utils/db'
import { arcs, gameSessions } from '../../../../../db/schema/sessions'
import { hasMinRole } from '../../../../../utils/permissions'
import type { CampaignRole } from '../../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const role = event.context.campaignRole as CampaignRole
  if (!hasMinRole(role, 'co_dm')) {
    throw createError({ statusCode: 403, message: 'Co-DM or above can delete arcs' })
  }

  const campaignId = getRouterParam(event, 'id')!
  const slug = getRouterParam(event, 'slug')!
  const db = useDb()

  const arc = db.select().from(arcs).where(and(eq(arcs.campaignId, campaignId), eq(arcs.slug, slug))).get()
  if (!arc) throw createError({ statusCode: 404, message: 'Arc not found' })

  db.update(gameSessions).set({ arcId: null }).where(eq(gameSessions.arcId, arc.id)).run()
  db.delete(arcs).where(eq(arcs.id, arc.id)).run()

  return { success: true }
})
