import { eq, and } from 'drizzle-orm'
import { z } from 'zod'
import { useDb } from '../../../../../../utils/db'
import { entities } from '../../../../../../db/schema/entities'
import { hasMinRole } from '../../../../../../utils/permissions'
import type { CampaignRole } from '../../../../../../utils/permissions'
import { updateLocationOrgDescription } from '../../../../../../services/organization-members'

const bodySchema = z.object({
  description: z.string(),
})

export default defineEventHandler(async (event) => {
  const role = event.context.campaignRole as CampaignRole
  if (!hasMinRole(role, 'editor')) {
    throw createError({ statusCode: 403, message: 'Editors or above can edit location links' })
  }

  const campaignId = getRouterParam(event, 'id')!
  const slug = getRouterParam(event, 'slug')!
  const organizationId = getRouterParam(event, 'organizationId')!
  const db = useDb()

  const location = db
    .select()
    .from(entities)
    .where(
      and(
        eq(entities.campaignId, campaignId),
        eq(entities.slug, slug),
        eq(entities.type, 'location'),
      ),
    )
    .get()
  if (!location) throw createError({ statusCode: 404, message: 'Location not found' })

  const body = await readValidatedBody(event, bodySchema.parse)

  try {
    return updateLocationOrgDescription(db, location.id, organizationId, body.description)
  } catch (err: unknown) {
    const code = (err as { statusCode?: number }).statusCode
    throw createError({ statusCode: code ?? 500, message: (err as Error).message })
  }
})
