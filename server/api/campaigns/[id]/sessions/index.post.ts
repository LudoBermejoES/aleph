import { randomUUID } from 'crypto'
import { eq, sql } from 'drizzle-orm'
import { useDb } from '../../../../utils/db'
import { gameSessions } from '../../../../db/schema/sessions'
import { hasMinRole } from '../../../../utils/permissions'
import { slugify, writeEntityFile, resolveEntityPath } from '../../../../services/content'
import { join } from 'path'
import type { CampaignRole } from '../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const role = event.context.campaignRole as CampaignRole
  if (!hasMinRole(role, 'co_dm')) {
    throw createError({ statusCode: 403, message: 'Co-DM or above can create sessions' })
  }

  const campaignId = getRouterParam(event, 'id')!
  const body = await readBody(event)
  const db = useDb()
  const campaign = event.context.campaign

  // Auto-increment session number
  const maxNum = db.select({ max: sql<number>`COALESCE(MAX(session_number), 0)` })
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

  db.insert(gameSessions).values({
    id,
    campaignId,
    title,
    slug,
    sessionNumber,
    scheduledDate: body.scheduledDate || null,
    status: body.status || 'planned',
    summary: body.summary || null,
    arcId: body.arcId || null,
    chapterId: body.chapterId || null,
    logFilePath: logPath,
    createdAt: now,
    updatedAt: now,
  }).run()

  return { id, slug, title, sessionNumber, status: body.status || 'planned' }
})
