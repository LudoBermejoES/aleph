import { eq, and, inArray } from 'drizzle-orm'
import { useDb } from '../../../../../utils/db'
import { entities } from '../../../../../db/schema/entities'
import { organizations, organizationMembers, organizationLocations } from '../../../../../db/schema/organizations'
import { sql } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const campaignId = getRouterParam(event, 'id')!
  const slug = getRouterParam(event, 'slug')!
  const db = useDb()

  const location = db.select().from(entities)
    .where(and(eq(entities.campaignId, campaignId), eq(entities.slug, slug), eq(entities.type, 'location')))
    .get()
  if (!location) throw createError({ statusCode: 404, message: 'Location not found' })

  const links = db.select({ organizationId: organizationLocations.organizationId })
    .from(organizationLocations)
    .where(eq(organizationLocations.locationEntityId, location.id))
    .all()

  if (links.length === 0) return []

  const orgIds = links.map(l => l.organizationId)

  const orgs = db.select({
    id: organizations.id,
    name: organizations.name,
    slug: organizations.slug,
    type: organizations.type,
    status: organizations.status,
    memberCount: sql<number>`count(${organizationMembers.characterId})`,
  })
    .from(organizations)
    .leftJoin(organizationMembers, eq(organizationMembers.organizationId, organizations.id))
    .where(and(eq(organizations.campaignId, campaignId), inArray(organizations.id, orgIds)))
    .groupBy(organizations.id)
    .all()

  return orgs
})
