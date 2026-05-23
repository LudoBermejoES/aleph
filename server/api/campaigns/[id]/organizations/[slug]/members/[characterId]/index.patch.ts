import { z } from 'zod'
import { eq, and } from 'drizzle-orm'
import { useDb } from '../../../../../../../utils/db'
import { validateBody } from '../../../../../../../utils/validate'
import { organizations } from '../../../../../../../db/schema'
import { hasMinRole } from '../../../../../../../utils/permissions'
import type { CampaignRole } from '../../../../../../../utils/permissions'
import { updateMemberRole } from '../../../../../../../services/organization-members'

export default defineEventHandler(async (event) => {
  const role = event.context.campaignRole as CampaignRole
  if (!hasMinRole(role, 'editor')) {
    throw createError({
      statusCode: 403,
      message: 'Editors or above can manage organization members',
    })
  }

  const campaignId = getRouterParam(event, 'id')!
  const slug = getRouterParam(event, 'slug')!
  const characterId = getRouterParam(event, 'characterId')!
  const db = useDb()

  const org = db
    .select({ id: organizations.id })
    .from(organizations)
    .where(and(eq(organizations.campaignId, campaignId), eq(organizations.slug, slug)))
    .get()

  if (!org) {
    throw createError({ statusCode: 404, message: 'Organization not found' })
  }

  const schema = z.object({ role: z.string() })
  const body = await validateBody(event, schema)

  return updateMemberRole(db, org.id, characterId, body.role)
})
