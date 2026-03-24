import { randomUUID } from 'crypto'
import { eq, and } from 'drizzle-orm'
import { useDb } from '../../../../../../utils/db'
import { gameSessions, decisions } from '../../../../../../db/schema/sessions'
import { hasMinRole } from '../../../../../../utils/permissions'
import type { CampaignRole } from '../../../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const role = event.context.campaignRole as CampaignRole
  if (!hasMinRole(role, 'co_dm')) {
    throw createError({ statusCode: 403, message: 'Co-DM or above can record decisions' })
  }

  const campaignId = getRouterParam(event, 'id')!
  const slug = getRouterParam(event, 'slug')!
  const body = await readBody(event)
  const db = useDb()

  const session = db.select().from(gameSessions)
    .where(and(eq(gameSessions.campaignId, campaignId), eq(gameSessions.slug, slug)))
    .get()
  if (!session) throw createError({ statusCode: 404, message: 'Session not found' })

  const id = randomUUID()
  db.insert(decisions).values({
    id,
    sessionId: session.id,
    campaignId,
    type: body.type || 'choice',
    title: body.title,
    description: body.description || null,
    entityId: body.entityId || null,
    createdAt: new Date(),
  }).run()

  return { id, title: body.title, type: body.type || 'choice' }
})
