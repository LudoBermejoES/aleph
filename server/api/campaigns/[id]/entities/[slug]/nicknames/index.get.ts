import { eq, and, asc } from 'drizzle-orm'
import { useDb } from '../../../../../../utils/db'
import { entities } from '../../../../../../db/schema/entities'
import { entityNicknames } from '../../../../../../db/schema/entity-nicknames'

export default defineEventHandler(async (event) => {
  const campaignId = getRouterParam(event, 'id')!
  const slug = getRouterParam(event, 'slug')!
  const db = useDb()

  const entity = db
    .select({ id: entities.id })
    .from(entities)
    .where(and(eq(entities.campaignId, campaignId), eq(entities.slug, slug)))
    .get()
  if (!entity) throw createError({ statusCode: 404, message: 'Entity not found' })

  return db
    .select()
    .from(entityNicknames)
    .where(eq(entityNicknames.entityId, entity.id))
    .orderBy(asc(entityNicknames.createdAt))
    .all()
})
