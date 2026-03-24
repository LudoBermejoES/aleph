import { eq, and } from 'drizzle-orm'
import { useDb } from '../../../../utils/db'
import { entityMentions } from '../../../../db/schema/mentions'
import { entities } from '../../../../db/schema/entities'

export default defineEventHandler(async (event) => {
  const campaignId = getRouterParam(event, 'id')!
  const query = getQuery(event)
  const entityId = query.entity_id as string

  if (!entityId) throw createError({ statusCode: 400, message: 'entity_id required' })

  const db = useDb()

  // Get entities that mention this entity (referenced BY)
  const mentionedBy = db.select({
    id: entityMentions.id,
    sourceEntityId: entityMentions.sourceEntityId,
    sourceName: entities.name,
    sourceType: entities.type,
    sourceSlug: entities.slug,
    count: entityMentions.count,
  })
    .from(entityMentions)
    .innerJoin(entities, eq(entityMentions.sourceEntityId, entities.id))
    .where(and(
      eq(entityMentions.targetEntityId, entityId),
      eq(entityMentions.campaignId, campaignId),
    ))
    .all()

  return mentionedBy
})
