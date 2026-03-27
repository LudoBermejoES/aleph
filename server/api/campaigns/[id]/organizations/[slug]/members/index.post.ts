import { eq, and } from 'drizzle-orm'
import { useDb } from '../../../../../../utils/db'
import { organizations, organizationMembers } from '../../../../../../db/schema'
import { entities } from '../../../../../../db/schema/entities'
import { characters } from '../../../../../../db/schema/characters'
import { hasMinRole } from '../../../../../../utils/permissions'
import type { CampaignRole } from '../../../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const role = event.context.campaignRole as CampaignRole
  if (!hasMinRole(role, 'editor')) {
    throw createError({ statusCode: 403, message: 'Editors or above can manage organization members' })
  }

  const campaignId = getRouterParam(event, 'id')!
  const slug = getRouterParam(event, 'slug')!
  const db = useDb()

  const org = db.select({ id: organizations.id })
    .from(organizations)
    .where(and(eq(organizations.campaignId, campaignId), eq(organizations.slug, slug)))
    .get()

  if (!org) {
    throw createError({ statusCode: 404, message: 'Organization not found' })
  }

  const body = await readBody(event)
  const { characterId, role: memberRole } = body

  if (!characterId) {
    throw createError({ statusCode: 400, message: 'characterId is required' })
  }

  // Verify character belongs to this campaign
  const character = db.select({ id: characters.id })
    .from(characters)
    .innerJoin(entities, eq(characters.entityId, entities.id))
    .where(and(eq(characters.id, characterId), eq(entities.campaignId, campaignId)))
    .get()

  if (!character) {
    throw createError({ statusCode: 404, message: 'Character not found in this campaign' })
  }

  // Check for duplicate
  const existing = db.select()
    .from(organizationMembers)
    .where(and(
      eq(organizationMembers.organizationId, org.id),
      eq(organizationMembers.characterId, characterId),
    ))
    .get()

  if (existing) {
    throw createError({ statusCode: 409, message: 'Character is already a member of this organization' })
  }

  db.insert(organizationMembers).values({
    organizationId: org.id,
    characterId,
    role: memberRole || null,
  }).run()

  return { organizationId: org.id, characterId, role: memberRole || null }
})
