import { eq, and } from 'drizzle-orm'
import { useDb } from '../../../../../utils/db'
import { entities } from '../../../../../db/schema/entities'
import { characters } from '../../../../../db/schema/characters'

export default defineEventHandler(async (event) => {
  const campaignId = getRouterParam(event, 'id')!
  const slug = getRouterParam(event, 'slug')!
  const db = useDb()

  const location = db.select().from(entities)
    .where(and(eq(entities.campaignId, campaignId), eq(entities.slug, slug), eq(entities.type, 'location')))
    .get()
  if (!location) throw createError({ statusCode: 404, message: 'Location not found' })

  // Primary inhabitants: characters with locationEntityId = this location
  const primary = db.select({
    id: characters.id,
    entityId: characters.entityId,
    characterType: characters.characterType,
    status: characters.status,
    locationEntityId: characters.locationEntityId,
    name: entities.name,
    slug: entities.slug,
  })
    .from(characters)
    .innerJoin(entities, eq(characters.entityId, entities.id))
    .where(and(eq(characters.locationEntityId, location.id), eq(entities.campaignId, campaignId)))
    .all()

  return primary.map(c => ({ ...c, source: 'primary' as const }))
})
