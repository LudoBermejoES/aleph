import { eq, and, inArray } from 'drizzle-orm'
import { useDb } from '../../../../../utils/db'
import { entities } from '../../../../../db/schema/entities'
import { organizations, organizationLocations } from '../../../../../db/schema/organizations'

export default defineEventHandler(async (event) => {
  const campaignId = getRouterParam(event, 'id')!
  const slug = getRouterParam(event, 'slug')!
  const db = useDb()

  const org = db.select({ id: organizations.id })
    .from(organizations)
    .where(and(eq(organizations.campaignId, campaignId), eq(organizations.slug, slug)))
    .get()
  if (!org) throw createError({ statusCode: 404, message: 'Organization not found' })

  const links = db.select({ locationEntityId: organizationLocations.locationEntityId })
    .from(organizationLocations)
    .where(eq(organizationLocations.organizationId, org.id))
    .all()

  if (links.length === 0) return []

  const locationIds = links.map(l => l.locationEntityId)

  return db.select({
    id: entities.id,
    name: entities.name,
    slug: entities.slug,
  })
    .from(entities)
    .where(and(eq(entities.campaignId, campaignId), inArray(entities.id, locationIds)))
    .all()
})
