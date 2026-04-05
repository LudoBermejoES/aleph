import { eq, and } from 'drizzle-orm'
import { useDb } from '../../../../../../utils/db'
import { gameSessions, sessionContents } from '../../../../../../db/schema/sessions'

const CONTENT_TYPES = ['manual_notes', 'ai_notes', 'summary'] as const

export default defineEventHandler(async (event) => {
  const campaignId = getRouterParam(event, 'id')!
  const slug = getRouterParam(event, 'slug')!
  const db = useDb()

  const session = db
    .select({ id: gameSessions.id })
    .from(gameSessions)
    .where(and(eq(gameSessions.campaignId, campaignId), eq(gameSessions.slug, slug)))
    .get()
  if (!session) throw createError({ statusCode: 404, message: 'Session not found' })

  const rows = db
    .select()
    .from(sessionContents)
    .where(eq(sessionContents.sessionId, session.id))
    .all()

  const result: Record<string, { id: string; content: string | null } | null> = {
    manual_notes: null,
    ai_notes: null,
    summary: null,
  }
  for (const row of rows) {
    if (CONTENT_TYPES.includes(row.type as any)) {
      result[row.type] = { id: row.id, content: row.content ?? null }
    }
  }

  return result
})
