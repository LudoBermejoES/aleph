import { eq, and } from 'drizzle-orm'
import { useDb } from '../../../../../../utils/db'
import { entities } from '../../../../../../db/schema/entities'
import { characters, characterConnections } from '../../../../../../db/schema/characters'

export default defineEventHandler(async (event) => {
  const campaignId = getRouterParam(event, 'id')!
  const slug = getRouterParam(event, 'slug')!
  const connectionId = getRouterParam(event, 'connectionId')!
  const db = useDb()

  const entity = db.select().from(entities)
    .where(and(eq(entities.campaignId, campaignId), eq(entities.slug, slug)))
    .get()
  if (!entity) throw createError({ statusCode: 404, message: 'Character not found' })

  const character = db.select().from(characters).where(eq(characters.entityId, entity.id)).get()
  if (!character) throw createError({ statusCode: 404, message: 'Character data not found' })

  const conn = db.select().from(characterConnections)
    .where(and(eq(characterConnections.id, connectionId), eq(characterConnections.characterId, character.id)))
    .get()
  if (!conn) throw createError({ statusCode: 404, message: 'Connection not found' })

  db.delete(characterConnections).where(eq(characterConnections.id, connectionId)).run()

  return { success: true }
})
