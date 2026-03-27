import { eq, and } from 'drizzle-orm'
import { useDb } from '../../../../../../utils/db'
import { entities } from '../../../../../../db/schema/entities'
import { characters } from '../../../../../../db/schema/characters'
import { hasMinRole } from '../../../../../../utils/permissions'
import type { CampaignRole } from '../../../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const role = event.context.campaignRole as CampaignRole
  if (!hasMinRole(role, 'editor')) {
    throw createError({ statusCode: 403, message: 'Editors or above can unlink inhabitants' })
  }

  const campaignId = getRouterParam(event, 'id')!
  const slug = getRouterParam(event, 'slug')!
  const characterId = getRouterParam(event, 'characterId')!
  const db = useDb()

  const location = db.select().from(entities)
    .where(and(eq(entities.campaignId, campaignId), eq(entities.slug, slug), eq(entities.type, 'location')))
    .get()
  if (!location) throw createError({ statusCode: 404, message: 'Location not found' })

  // Clear the character's primary location if it points to this location
  db.update(characters)
    .set({ locationEntityId: null })
    .where(and(eq(characters.id, characterId), eq(characters.locationEntityId, location.id)))
    .run()

  return null
})
