import { z } from 'zod'
import { eq, and } from 'drizzle-orm'
import { useDb } from '../../../../../utils/db'
import { validateBody } from '../../../../../utils/validate'
import { gameSessions, sessionGroups } from '../../../../../db/schema/sessions'
import { hasMinRole } from '../../../../../utils/permissions'
import { writeEntityFile, readEntityFile } from '../../../../../services/content'
import type { CampaignRole } from '../../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const role = event.context.campaignRole as CampaignRole
  if (!hasMinRole(role, 'co_dm')) {
    throw createError({ statusCode: 403, message: 'Co-DM or above can edit sessions' })
  }

  const campaignId = getRouterParam(event, 'id')!
  const slug = getRouterParam(event, 'slug')!
  const sessionPutSchema = z.object({
    title: z.string().optional(),
    status: z.string().optional(),
    scheduledDate: z.string().nullable().optional(),
    summary: z.string().nullable().optional(),
    arcId: z.string().nullable().optional(),
    chapterId: z.string().nullable().optional(),
    groupSlug: z.string().nullable().optional(),
    content: z.string().optional(),
  })
  const body = await validateBody(event, sessionPutSchema)
  const db = useDb()

  const session = db.select().from(gameSessions)
    .where(and(eq(gameSessions.campaignId, campaignId), eq(gameSessions.slug, slug)))
    .get()
  if (!session) throw createError({ statusCode: 404, message: 'Session not found' })

  const updates: Record<string, unknown> = { updatedAt: new Date() }
  if (body.title !== undefined) updates.title = body.title
  if (body.status !== undefined) updates.status = body.status
  if (body.scheduledDate !== undefined) updates.scheduledDate = body.scheduledDate || null
  if (body.summary !== undefined) updates.summary = body.summary || null
  if (body.arcId !== undefined) updates.arcId = body.arcId || null
  if (body.chapterId !== undefined) updates.chapterId = body.chapterId || null
  if (body.groupSlug !== undefined) {
    if (body.groupSlug === null || body.groupSlug === '') {
      updates.groupId = null
    } else {
      const group = db.select({ id: sessionGroups.id }).from(sessionGroups)
        .where(and(eq(sessionGroups.campaignId, campaignId), eq(sessionGroups.slug, body.groupSlug)))
        .get()
      if (!group) throw createError({ statusCode: 404, message: `Session group "${body.groupSlug}" not found` })
      updates.groupId = group.id
    }
  }

  db.update(gameSessions).set(updates).where(eq(gameSessions.id, session.id)).run()

  // Update log file content if provided
  if (body.content !== undefined && session.logFilePath) {
    let existing
    try { existing = await readEntityFile(session.logFilePath) } catch { existing = { frontmatter: { type: 'session', name: session.title, aliases: [], tags: [], visibility: 'members' as const, fields: {} }, content: '' } }
    await writeEntityFile(session.logFilePath, existing.frontmatter, body.content)
  }

  return { success: true }
})
