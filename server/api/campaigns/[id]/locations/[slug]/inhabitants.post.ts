import { eq, and } from 'drizzle-orm'
import { useDb } from '../../../../../utils/db'
import { entities } from '../../../../../db/schema/entities'
import { characters } from '../../../../../db/schema/characters'
import { hasMinRole } from '../../../../../utils/permissions'
import type { CampaignRole } from '../../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const role = event.context.campaignRole as CampaignRole
  if (!hasMinRole(role, 'editor')) {
    throw createError({ statusCode: 403, message: 'Editors or above can link inhabitants' })
  }

  const campaignId = getRouterParam(event, 'id')!
  const slug = getRouterParam(event, 'slug')!
  const body = await readBody(event)
  const { characterId } = body

  if (!characterId) throw createError({ statusCode: 400, message: 'characterId is required' })

  const db = useDb()

  const location = db.select().from(entities)
    .where(and(eq(entities.campaignId, campaignId), eq(entities.slug, slug), eq(entities.type, 'location')))
    .get()
  if (!location) throw createError({ statusCode: 404, message: 'Location not found' })

  // Verify character belongs to this campaign
  const character = db.select({ id: characters.id })
    .from(characters)
    .innerJoin(entities, eq(characters.entityId, entities.id))
    .where(and(eq(characters.id, characterId), eq(entities.campaignId, campaignId)))
    .get()
  if (!character) throw createError({ statusCode: 404, message: 'Character not found' })

  // Set as primary location
  db.update(characters).set({ locationEntityId: location.id }).where(eq(characters.id, characterId)).run()

  return { success: true }
})
