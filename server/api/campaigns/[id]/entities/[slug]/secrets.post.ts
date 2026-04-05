import { eq, and } from 'drizzle-orm'
import { useDb } from '../../../../../utils/db'
import { entities } from '../../../../../db/schema/entities'
import { secretReveals } from '../../../../../db/schema/secrets'
import { hasMinRole } from '../../../../../utils/permissions'
import { emitCampaignMessage } from '../../../../../utils/broadcast'
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
  const blockId = body?.blockId
  if (!blockId || typeof blockId !== 'string') {
    throw createError({ statusCode: 400, message: 'blockId is required' })
  }

  const entity = db.select({ id: entities.id })
    .from(entities)
    .where(and(eq(entities.campaignId, campaignId), eq(entities.slug, slug)))
    .get()
  if (!entity) throw createError({ statusCode: 404, message: 'Entity not found' })

  // Upsert: ignore if already revealed
  const existing = db.select({ id: secretReveals.id })
    .from(secretReveals)
    .where(and(eq(secretReveals.entityId, entity.id), eq(secretReveals.secretBlockId, blockId)))
    .get()

  if (!existing) {
    db.insert(secretReveals).values({
      id: randomUUID(),
      entityId: entity.id,
      secretBlockId: blockId,
      revealedBy: userId,
      revealedAt: new Date(),
    }).run()
  }

  emitCampaignMessage(campaignId, {
    type: 'secret:reveal',
    entityId: entity.id,
    entitySlug: slug,
    blockId,
    revealedBy: userId,
  })

  return { revealed: true, blockId }
})
