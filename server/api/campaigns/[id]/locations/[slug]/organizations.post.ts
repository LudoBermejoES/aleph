import { eq, and } from 'drizzle-orm'
import { useDb } from '../../../../../utils/db'
import { entities } from '../../../../../db/schema/entities'
import { organizations, organizationLocations } from '../../../../../db/schema/organizations'
import { hasMinRole } from '../../../../../utils/permissions'
import type { CampaignRole } from '../../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const role = event.context.campaignRole as CampaignRole
  if (!hasMinRole(role, 'editor')) {
    throw createError({ statusCode: 403, message: 'Editors or above can link organizations' })
  }

  const campaignId = getRouterParam(event, 'id')!
  const slug = getRouterParam(event, 'slug')!
  const body = await readBody(event)
  const { organizationId } = body

  if (!organizationId) throw createError({ statusCode: 400, message: 'organizationId is required' })

  const db = useDb()

  const location = db.select().from(entities)
    .where(and(eq(entities.campaignId, campaignId), eq(entities.slug, slug), eq(entities.type, 'location')))
    .get()
  if (!location) throw createError({ statusCode: 404, message: 'Location not found' })

  const org = db.select({ id: organizations.id })
    .from(organizations)
    .where(and(eq(organizations.id, organizationId), eq(organizations.campaignId, campaignId)))
    .get()
  if (!org) throw createError({ statusCode: 404, message: 'Organization not found' })

  // Insert link (ignore if already exists)
  try {
    db.insert(organizationLocations).values({
      organizationId,
      locationEntityId: location.id,
    }).run()
  } catch { /* duplicate — already linked */ }

  return { success: true }
})
