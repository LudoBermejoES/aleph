import { z } from 'zod'
import { randomUUID } from 'crypto'
import { eq, sql } from 'drizzle-orm'
import { useDb } from '../../../../utils/db'
import { validateBody } from '../../../../utils/validate'
import { gameSessions } from '../../../../db/schema/sessions'
import { hasMinRole } from '../../../../utils/permissions'
import { resolveArcChapterSlugs } from '../../../../utils/arc-chapter'
import { resolveSubCampaignIdForCreate } from '../../../../utils/sub-campaign'
import { slugify, writeEntityFile, resolveEntityPath } from '../../../../services/content'
import { join } from 'path'
import type { CampaignRole } from '../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const role = event.context.campaignRole as CampaignRole
  if (!hasMinRole(role, 'co_dm')) {
    throw createError({ statusCode: 403, message: 'Co-DM or above can create sessions' })
  }

  const campaignId = getRouterParam(event, 'id')!
  const sessionSchema = z.object({
    title: z.string().optional(),
    content: z.string().optional(),
    status: z.string().optional(),
    scheduledDate: z.string().optional(),
    summary: z.string().optional(),
    arcId: z.string().optional(),
    chapterId: z.string().optional(),
    arcSlug: z.string().nullable().optional(),
    chapterSlug: z.string().nullable().optional(),
    subCampaignSlug: z.string().optional(),
  })
  const body = await validateBody(event, sessionSchema)
  const db = useDb()
  const campaign = event.context.campaign

  // Resolved before the log file is written so an unresolvable/ambiguous slug does not
  // leave an orphan session .md behind.
  const bySlug = resolveArcChapterSlugs(db, campaignId, {
    arcSlug: body.arcSlug,
    chapterSlug: body.chapterSlug,
  })

  // Auto-increment session number
  const maxNum = db
    .select({ max: sql<number>`COALESCE(MAX(session_number), 0)` })
    .from(gameSessions)
    .where(eq(gameSessions.campaignId, campaignId))
    .get()
  const sessionNumber = (maxNum?.max ?? 0) + 1

  const id = randomUUID()
  const title = body.title || `Session ${sessionNumber}`
  const slug = slugify(title)
  const now = new Date()

  // Write session log .md file
  const contentDir = join(process.cwd(), campaign.contentDir)
  const logPath = resolveEntityPath(contentDir, 'sessions', slug)
  const frontmatter = {
    type: 'session',
    name: title,
    aliases: [] as string[],
    tags: ['session'],
    visibility: 'members' as const,
    fields: { sessionNumber, status: body.status || 'planned' },
  }
  await writeEntityFile(logPath, frontmatter, body.content || `# ${title}\n\nSession notes...`)

  const subCampaignId = resolveSubCampaignIdForCreate(db, campaignId, body.subCampaignSlug)

  db.insert(gameSessions)
    .values({
      id,
      campaignId,
      title,
      slug,
      sessionNumber,
      scheduledDate: body.scheduledDate || null,
      status: body.status || 'planned',
      summary: body.summary || null,
      arcId: bySlug.arcId !== undefined ? bySlug.arcId : body.arcId || null,
      chapterId: bySlug.chapterId !== undefined ? bySlug.chapterId : body.chapterId || null,
      subCampaignId,
      logFilePath: logPath,
      createdAt: now,
      updatedAt: now,
    })
    .run()

  return {
    id,
    slug,
    title,
    sessionNumber,
    status: body.status || 'planned',
    subCampaignId,
    arcId: bySlug.arcId !== undefined ? bySlug.arcId : body.arcId || null,
    chapterId: bySlug.chapterId !== undefined ? bySlug.chapterId : body.chapterId || null,
  }
})
