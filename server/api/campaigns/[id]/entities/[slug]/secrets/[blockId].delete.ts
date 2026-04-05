import { eq, and } from 'drizzle-orm'
import { useDb } from '../../../../../../utils/db'
import { entities } from '../../../../../../db/schema/entities'
import { secretReveals } from '../../../../../../db/schema/secrets'
import { hasMinRole } from '../../../../../../utils/permissions'
import { emitCampaignMessage } from '../../../../../../utils/broadcast'
import type { CampaignRole } from '../../../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const role = event.context.campaignRole as CampaignRole
  if (!hasMinRole(role, 'co_dm')) {
    throw createError({ statusCode: 403, message: 'DM or Co-DM required' })
  }

  const campaignId = getRouterParam(event, 'id')!
  const slug = getRouterParam(event, 'slug')!
  const blockId = getRouterParam(event, 'blockId')!
  const userId = event.context.user!.id
  const db = useDb()

  const entity = db.select({ id: entities.id })
    .from(entities)
    .where(and(eq(entities.campaignId, campaignId), eq(entities.slug, slug)))
    .get()
  if (!entity) throw createError({ statusCode: 404, message: 'Entity not found' })

  db.delete(secretReveals)
    .where(and(eq(secretReveals.entityId, entity.id), eq(secretReveals.secretBlockId, blockId)))
    .run()

  emitCampaignMessage(campaignId, {
    type: 'secret:unreveal',
    entityId: entity.id,
    entitySlug: slug,
    blockId,
    unreavealedBy: userId,
  })

  return { revealed: false, blockId }
})
