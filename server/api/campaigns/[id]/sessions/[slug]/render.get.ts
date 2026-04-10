import { eq, and } from 'drizzle-orm'
import { useDb } from '../../../../../utils/db'
import { gameSessions } from '../../../../../db/schema/sessions'
import { readEntityFile, stripSecretBlocks } from '../../../../../services/content'
import { autoLinkContent } from '../../../../../services/autolink-render'
import { hasMinRole } from '../../../../../utils/permissions'
import type { CampaignRole } from '../../../../../utils/permissions'

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
