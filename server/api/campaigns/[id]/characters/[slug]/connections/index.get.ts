import { eq, and } from 'drizzle-orm'
import { useDb } from '../../../../../../utils/db'
import { entities } from '../../../../../../db/schema/entities'
import { characters, characterConnections } from '../../../../../../db/schema/characters'

export default defineEventHandler(async (event) => {
  const campaignId = getRouterParam(event, 'id')!
  const slug = getRouterParam(event, 'slug')!
  const db = useDb()

  const entity = db.select().from(entities)
    .where(and(eq(entities.campaignId, campaignId), eq(entities.slug, slug)))
    .get()
  if (!entity) throw createError({ statusCode: 404, message: 'Character not found' })

  const character = db.select().from(characters).where(eq(characters.entityId, entity.id)).get()
  if (!character) throw createError({ statusCode: 404, message: 'Character data not found' })

  const targetEntities = db.select({
    id: entities.id,
    name: entities.name,
    slug: entities.slug,
    type: entities.type,
  }).from(entities).where(eq(entities.campaignId, campaignId)).all()
  const entityMap = Object.fromEntries(targetEntities.map(e => [e.id, e]))

  const conns = db.select().from(characterConnections)
    .where(eq(characterConnections.characterId, character.id))
    .orderBy(characterConnections.sortOrder)
    .all()

  return conns.map(c => ({
    ...c,
    targetEntityName: entityMap[c.targetEntityId]?.name ?? null,
    targetEntitySlug: entityMap[c.targetEntityId]?.slug ?? null,
    targetEntityType: entityMap[c.targetEntityId]?.type ?? null,
  }))
})
