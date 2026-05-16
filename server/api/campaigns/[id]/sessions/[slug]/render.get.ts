import { eq, and } from 'drizzle-orm'
import { useDb } from '../../../../../utils/db'
import { gameSessions, sessionContents } from '../../../../../db/schema/sessions'
import { readEntityFile, stripSecretBlocks } from '../../../../../services/content'
import { autoLinkContent } from '../../../../../services/autolink-render'
import { hasMinRole } from '../../../../../utils/permissions'
import type { CampaignRole } from '../../../../../utils/permissions'

const CONTENT_TYPES = ['manual_notes', 'ai_notes', 'summary'] as const
type ContentType = (typeof CONTENT_TYPES)[number]

export default defineEventHandler(async (event) => {
  const campaignId = getRouterParam(event, 'id')!
  const slug = getRouterParam(event, 'slug')!
  const db = useDb()
  const actualRole = (event.context.campaignRole || 'visitor') as CampaignRole

  const session = db
    .select()
    .from(gameSessions)
    .where(and(eq(gameSessions.campaignId, campaignId), eq(gameSessions.slug, slug)))
    .get()
  if (!session) throw createError({ statusCode: 404, message: 'Session not found' })

  // Support preview_as for DM/Co-DM only
  const previewAs = getQuery(event).preview_as as string | undefined
  let effectiveRole = actualRole
  let previewMode = false
  if (previewAs && hasMinRole(actualRole, 'co_dm')) {
    const validRoles: CampaignRole[] = ['dm', 'co_dm', 'editor', 'player', 'visitor']
    if (validRoles.includes(previewAs as CampaignRole)) {
      effectiveRole = previewAs as CampaignRole
      previewMode = true
    }
  }

  // If ?type= is one of the session content types, render from DB instead of log file
  const contentType = getQuery(event).type as string | undefined
  if (contentType && CONTENT_TYPES.includes(contentType as ContentType)) {
    const row = db
      .select({ content: sessionContents.content })
      .from(sessionContents)
      .where(and(eq(sessionContents.sessionId, session.id), eq(sessionContents.type, contentType)))
      .get()
    const raw = row?.content ?? ''
    const rendered = autoLinkContent(raw, campaignId, session.id, db)
    return { content: rendered, previewMode, effectiveRole }
  }

  let rawContent = ''
  if (session.logFilePath) {
    try {
      const file = await readEntityFile(session.logFilePath)
      rawContent = file.content
    } catch {
      /* log file may not exist yet */
    }
  }

  const strippedContent = stripSecretBlocks(rawContent, effectiveRole)
  const renderedContent = autoLinkContent(strippedContent, campaignId, session.id, db)

  return {
    content: renderedContent,
    previewMode,
    effectiveRole,
  }
})
