import { eq, and } from 'drizzle-orm'
import { useDb } from '../../../../../utils/db'
import {
  gameSessions,
  sessionAttendance,
  subCampaigns,
  sessionContents,
  arcs,
  chapters,
} from '../../../../../db/schema/sessions'
import { user } from '../../../../../db/schema/auth'
import { readEntityFile } from '../../../../../services/content'
import { withApiHandler } from '../../../../../utils/api-handler'

export default defineEventHandler((event) =>
  withApiHandler(event, async () => {
    const campaignId = getRouterParam(event, 'id')!
    const slug = getRouterParam(event, 'slug')!
    const db = useDb()

    const session = db
      .select()
      .from(gameSessions)
      .where(and(eq(gameSessions.campaignId, campaignId), eq(gameSessions.slug, slug)))
      .get()
    if (!session) throw createError({ statusCode: 404, message: 'Session not found' })

    // Get sub-campaign name/slug (every session always has one)
    let subCampaignName: string | null = null
    let subCampaignSlug: string | null = null
    if (session.subCampaignId) {
      const subCampaign = db
        .select({ name: subCampaigns.name, slug: subCampaigns.slug })
        .from(subCampaigns)
        .where(eq(subCampaigns.id, session.subCampaignId))
        .get()
      subCampaignName = subCampaign?.name ?? null
      subCampaignSlug = subCampaign?.slug ?? null
    }

    // Arc/chapter names, same idiom as subCampaignName above, so this response and the list
    // response agree on which name fields exist.
    let arcName: string | null = null
    // The slug comes along so a client can link to the arc without a second request.
    let arcSlug: string | null = null
    if (session.arcId) {
      const arc = db
        .select({ name: arcs.name, slug: arcs.slug })
        .from(arcs)
        .where(eq(arcs.id, session.arcId))
        .get()
      arcName = arc?.name ?? null
      arcSlug = arc?.slug ?? null
    }

    let chapterName: string | null = null
    if (session.chapterId) {
      const chapter = db
        .select({ name: chapters.name })
        .from(chapters)
        .where(eq(chapters.id, session.chapterId))
        .get()
      chapterName = chapter?.name ?? null
    }

    // Get attendance
    const attendance = db
      .select({
        id: sessionAttendance.id,
        userId: sessionAttendance.userId,
        userName: user.name,
        characterId: sessionAttendance.characterId,
        rsvpStatus: sessionAttendance.rsvpStatus,
        attended: sessionAttendance.attended,
        xp: sessionAttendance.xp,
      })
      .from(sessionAttendance)
      .innerJoin(user, eq(sessionAttendance.userId, user.id))
      .where(eq(sessionAttendance.sessionId, session.id))
      .all()

    // hasContent flags
    const contentRows = db
      .select({ type: sessionContents.type })
      .from(sessionContents)
      .where(eq(sessionContents.sessionId, session.id))
      .all()
    const hasContent = {
      manual_notes: contentRows.some((r) => r.type === 'manual_notes'),
      ai_notes: contentRows.some((r) => r.type === 'ai_notes'),
      summary: contentRows.some((r) => r.type === 'summary'),
    }

    // Read log file
    let log = { frontmatter: {}, content: '' }
    if (session.logFilePath) {
      try {
        log = await readEntityFile(session.logFilePath)
      } catch {
        /* log file may not exist yet */
      }
    }

    return {
      ...session,
      subCampaignName,
      subCampaignSlug,
      arcName,
      arcSlug,
      chapterName,
      attendance,
      hasContent,
      logContent: log.content,
    }
  }),
)
