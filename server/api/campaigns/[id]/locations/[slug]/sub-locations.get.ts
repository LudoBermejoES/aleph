import { eq, and } from 'drizzle-orm'
import { useDb } from '../../../../../utils/db'
import { entities } from '../../../../../db/schema/entities'
import { characters } from '../../../../../db/schema/characters'

export default defineEventHandler(async (event) => {
  const campaignId = getRouterParam(event, 'id')!
  const slug = getRouterParam(event, 'slug')!
  const db = useDb()

  const parent = db.select().from(entities)
    .where(and(eq(entities.campaignId, campaignId), eq(entities.slug, slug), eq(entities.type, 'location')))
    .get()
  if (!parent) throw createError({ statusCode: 404, message: 'Location not found' })

  const children = db.select().from(entities)
    .where(and(eq(entities.campaignId, campaignId), eq(entities.type, 'location'), eq(entities.parentId, parent.id)))
    .orderBy(entities.name)
    .all()

  // Enrich with childCount and inhabitantCount
  const allLocations = db.select({ id: entities.id, parentId: entities.parentId })
    .from(entities)
    .where(and(eq(entities.campaignId, campaignId), eq(entities.type, 'location')))
    .all()

  const childCountMap = new Map<string, number>()
  for (const loc of allLocations) {
    if (loc.parentId) childCountMap.set(loc.parentId, (childCountMap.get(loc.parentId) ?? 0) + 1)
  }

  const allChars = db.select({ locationEntityId: characters.locationEntityId }).from(characters).all()
  const inhabitantCountMap = new Map<string, number>()
  for (const c of allChars) {
    if (c.locationEntityId) inhabitantCountMap.set(c.locationEntityId, (inhabitantCountMap.get(c.locationEntityId) ?? 0) + 1)
  }

  return children.map(c => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    visibility: c.visibility,
    childCount: childCountMap.get(c.id) ?? 0,
    inhabitantCount: inhabitantCountMap.get(c.id) ?? 0,
  }))
})
