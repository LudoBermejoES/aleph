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

  // Campaign-scoped in one query — see the note in index.put.ts. Deleting the wrong
  // campaign's chapter would be worse than 404ing on the right one.
  const chapter = db
    .select({ id: chapters.id })
    .from(chapters)
    .innerJoin(arcs, eq(chapters.arcId, arcs.id))
    .where(and(eq(arcs.campaignId, campaignId), eq(chapters.slug, slug)))
    .get()
  if (!chapter) throw createError({ statusCode: 404, message: 'Chapter not found' })

  db.update(gameSessions)
    .set({ chapterId: null })
    .where(eq(gameSessions.chapterId, chapter.id))
    .run()
  db.delete(chapters).where(eq(chapters.id, chapter.id)).run()

  return { success: true }
})
