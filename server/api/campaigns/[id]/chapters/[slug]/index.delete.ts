import { eq, and } from 'drizzle-orm'
import { useDb } from '../../../../../utils/db'
import { arcs, chapters, gameSessions } from '../../../../../db/schema/sessions'
import { hasMinRole } from '../../../../../utils/permissions'
import type { CampaignRole } from '../../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const role = event.context.campaignRole as CampaignRole
  if (!hasMinRole(role, 'co_dm')) {
    throw createError({ statusCode: 403, message: 'Co-DM or above can delete chapters' })
  }

  const campaignId = getRouterParam(event, 'id')!
  const slug = getRouterParam(event, 'slug')!
  const db = useDb()

  const chapter = db.select().from(chapters).where(eq(chapters.slug, slug)).get()
  if (!chapter) throw createError({ statusCode: 404, message: 'Chapter not found' })

  const arc = db.select().from(arcs).where(and(eq(arcs.id, chapter.arcId), eq(arcs.campaignId, campaignId))).get()
  if (!arc) throw createError({ statusCode: 404, message: 'Chapter not found in this campaign' })

  db.update(gameSessions).set({ chapterId: null }).where(eq(gameSessions.chapterId, chapter.id)).run()
  db.delete(chapters).where(eq(chapters.id, chapter.id)).run()

  return { success: true }
})
