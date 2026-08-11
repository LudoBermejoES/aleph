import { z } from 'zod'
import { eq, and } from 'drizzle-orm'
import { useDb, useSqlite } from '../../../../../utils/db'
import { validateBody } from '../../../../../utils/validate'
import { gameSessions } from '../../../../../db/schema/sessions'
import { entities } from '../../../../../db/schema/entities'
import { hasMinRole } from '../../../../../utils/permissions'
import { resolveArcChapterSlugs } from '../../../../../utils/arc-chapter'
import { resolveSubCampaignSlug } from '../../../../../utils/sub-campaign'
import { writeEntityFile, readEntityFile } from '../../../../../services/content'
import { indexEntity } from '../../../../../services/search'
import { indexEntityEmbedding } from '../../../../../services/embeddings'
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
    arcSlug: z.string().nullable().optional(),
    chapterSlug: z.string().nullable().optional(),
    subCampaignSlug: z.string().optional(),
    content: z.string().optional(),
  })
  const body = await validateBody(event, sessionPutSchema)
  const db = useDb()

  const session = db
    .select()
    .from(gameSessions)
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
  // Slug-addressed arc/chapter assignment. Resolved before any write, so a 404/409/422
  // leaves the session row untouched. Applied after the id fields, so an explicit slug
  // wins if a caller sends both forms.
  // The chapter the session will hold if no slug touches it — the id form, when sent in
  // this same request, is what a change of arc has to be checked against, not the stored
  // value it is about to replace.
  const effectiveChapterId =
    body.chapterId !== undefined ? body.chapterId || null : session.chapterId
  const bySlug = resolveArcChapterSlugs(
    db,
    campaignId,
    { arcSlug: body.arcSlug, chapterSlug: body.chapterSlug },
    { chapterId: effectiveChapterId },
  )
  if (bySlug.arcId !== undefined) updates.arcId = bySlug.arcId
  if (bySlug.chapterId !== undefined) updates.chapterId = bySlug.chapterId
  if (body.subCampaignSlug) {
    updates.subCampaignId = resolveSubCampaignSlug(db, campaignId, body.subCampaignSlug)
  }

  db.update(gameSessions).set(updates).where(eq(gameSessions.id, session.id)).run()

  // Keep the mirror entity (game_sessions.id === entities.id) in sync: name is the only
  // field the relation graph / entity lookup surface.
  if (body.title !== undefined) {
    db.update(entities)
      .set({ name: body.title, updatedAt: new Date() })
      .where(eq(entities.id, session.id))
      .run()
  }

  // Update log file content if provided
  if (body.content !== undefined && session.logFilePath) {
    let existing
    try {
      existing = await readEntityFile(session.logFilePath)
    } catch {
      existing = {
        frontmatter: {
          type: 'session',
          name: session.title,
          aliases: [],
          tags: [],
          visibility: 'members' as const,
          fields: {},
        },
        content: '',
      }
    }
    await writeEntityFile(session.logFilePath, existing.frontmatter, body.content)
  }

  // Re-index with the current name/content, whichever (if either) just changed.
  const finalName = body.title !== undefined ? body.title : session.title
  let finalContent = ''
  if (session.logFilePath) {
    try {
      finalContent = (await readEntityFile(session.logFilePath)).content
    } catch {
      finalContent = ''
    }
  }
  const sqlite = useSqlite()
  indexEntity(sqlite, session.id, campaignId, finalName, [], ['session'], finalContent)
  await indexEntityEmbedding(sqlite, session.id, campaignId, finalName, finalContent)

  return { success: true }
})
