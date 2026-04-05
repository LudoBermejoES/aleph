import { eq, and } from 'drizzle-orm'
import { useDb } from '../../../../../utils/db'
import { entities } from '../../../../../db/schema/entities'
import { entitySecretNotes } from '../../../../../db/schema/secrets'
import { hasMinRole } from '../../../../../utils/permissions'
import { randomUUID } from 'crypto'
import type { CampaignRole } from '../../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const role = event.context.campaignRole as CampaignRole
  if (!hasMinRole(role, 'co_dm')) {
    throw createError({ statusCode: 403, message: 'DM or Co-DM required' })
  }

  const campaignId = getRouterParam(event, 'id')!
  const slug = getRouterParam(event, 'slug')!
  const userId = event.context.user!.id
  const db = useDb()

  const body = await readBody(event)
  if (typeof body?.content !== 'string') {
    throw createError({ statusCode: 400, message: 'content (string) is required' })
  }

  const entity = db.select({ id: entities.id })
    .from(entities)
    .where(and(eq(entities.campaignId, campaignId), eq(entities.slug, slug)))
    .get()
  if (!entity) throw createError({ statusCode: 404, message: 'Entity not found' })

  const existing = db.select({ id: entitySecretNotes.id })
    .from(entitySecretNotes)
    .where(eq(entitySecretNotes.entityId, entity.id))
    .get()

  const now = new Date()

  if (existing) {
    db.update(entitySecretNotes)
      .set({ content: body.content, updatedBy: userId, updatedAt: now })
      .where(eq(entitySecretNotes.id, existing.id))
      .run()
  } else {
    db.insert(entitySecretNotes).values({
      id: randomUUID(),
      entityId: entity.id,
      content: body.content,
      updatedBy: userId,
      updatedAt: now,
    }).run()
  }

  return { content: body.content, updatedAt: now }
})
