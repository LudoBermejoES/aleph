import { eq, and } from 'drizzle-orm'
import { useDb } from '../../../../../../utils/db'
import { entities } from '../../../../../../db/schema/entities'
import { organizations, organizationLocations } from '../../../../../../db/schema/organizations'
import { hasMinRole } from '../../../../../../utils/permissions'
import type { CampaignRole } from '../../../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const role = event.context.campaignRole as CampaignRole
  if (!hasMinRole(role, 'editor')) {
    throw createError({ statusCode: 403, message: 'Editors or above can unlink organizations' })
  }

  const campaignId = getRouterParam(event, 'id')!
  const slug = getRouterParam(event, 'slug')!
  const organizationId = getRouterParam(event, 'organizationId')!
  const db = useDb()

  const location = db.select().from(entities)
    .where(and(eq(entities.campaignId, campaignId), eq(entities.slug, slug), eq(entities.type, 'location')))
    .get()
  if (!location) throw createError({ statusCode: 404, message: 'Location not found' })

  db.delete(organizationLocations)
    .where(and(
      eq(organizationLocations.organizationId, organizationId),
      eq(organizationLocations.locationEntityId, location.id),
    ))
    .run()

  return null
})
