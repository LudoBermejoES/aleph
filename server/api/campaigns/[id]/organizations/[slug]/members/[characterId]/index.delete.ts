import { eq, and } from 'drizzle-orm'
import { useDb } from '../../../../../../../utils/db'
import { organizations, organizationMembers } from '../../../../../../../db/schema'
import { hasMinRole } from '../../../../../../../utils/permissions'
import type { CampaignRole } from '../../../../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const role = event.context.campaignRole as CampaignRole
  if (!hasMinRole(role, 'editor')) {
    throw createError({ statusCode: 403, message: 'Editors or above can manage organization members' })
  }

  const campaignId = getRouterParam(event, 'id')!
  const slug = getRouterParam(event, 'slug')!
  const characterId = getRouterParam(event, 'characterId')!
  const db = useDb()

  const org = db.select({ id: organizations.id })
    .from(organizations)
    .where(and(eq(organizations.campaignId, campaignId), eq(organizations.slug, slug)))
    .get()

  if (!org) {
    throw createError({ statusCode: 404, message: 'Organization not found' })
  }

  const membership = db.select()
    .from(organizationMembers)
    .where(and(
      eq(organizationMembers.organizationId, org.id),
      eq(organizationMembers.characterId, characterId),
    ))
    .get()

  if (!membership) {
    throw createError({ statusCode: 404, message: 'Character is not a member of this organization' })
  }

  db.delete(organizationMembers)
    .where(and(
      eq(organizationMembers.organizationId, org.id),
      eq(organizationMembers.characterId, characterId),
    ))
    .run()

  return { success: true }
})
