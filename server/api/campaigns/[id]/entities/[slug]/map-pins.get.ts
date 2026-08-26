import { eq, and } from 'drizzle-orm'
import { useDb } from '../../../../../utils/db'
import { entities } from '../../../../../db/schema/entities'
import { getMapPinsForEntity } from '../../../../../services/maps'
import type { CampaignRole } from '../../../../../utils/permissions'

/**
 * show-entity-map-pins/design.md D1: the reverse lookup, "which maps is this entity pinned
 * on" -- one endpoint under `entities/[slug]/`, matching the existing sibling pattern in this
 * tree (resolve the entity by campaign + slug, 404 if absent, then query by its id). A
 * location, a character and an organization all resolve here the same way, because each of
 * them either IS an `entities` row (a location) or carries its own `entityId` pointing at one
 * (a character, an organization) -- the three detail pages pass their own entity's slug.
 *
 * Always returns a list, even for zero or one placement (design.md D1) -- the singular case
 * is never assumed.
 */
export default defineEventHandler(async (event) => {
  const campaignId = getRouterParam(event, 'id')!
  const slug = getRouterParam(event, 'slug')!
  const role = (event.context.campaignRole || 'visitor') as CampaignRole
  const db = useDb()

  const entity = db
    .select({ id: entities.id })
    .from(entities)
    .where(and(eq(entities.campaignId, campaignId), eq(entities.slug, slug)))
    .get()
  if (!entity) throw createError({ statusCode: 404, message: 'Entity not found' })

  return getMapPinsForEntity(db, entity.id, role)
})
