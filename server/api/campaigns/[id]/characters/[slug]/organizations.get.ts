import { eq, and } from 'drizzle-orm'
import { useDb } from '../../../../../utils/db'
import { organizations, organizationMembers } from '../../../../../db/schema'
import { entities } from '../../../../../db/schema/entities'
import { characters } from '../../../../../db/schema/characters'

export default defineEventHandler(async (event) => {
  const campaignId = getRouterParam(event, 'id')!
  const slug = getRouterParam(event, 'slug')!
  const db = useDb()

  const character = db.select({ id: characters.id })
    .from(characters)
    .innerJoin(entities, eq(characters.entityId, entities.id))
    .where(and(eq(entities.slug, slug), eq(entities.campaignId, campaignId)))
    .get()

  if (!character) {
    throw createError({ statusCode: 404, message: 'Character not found' })
  }

  const memberships = db.select({
    organizationId: organizations.id,
    organizationName: organizations.name,
    organizationSlug: organizations.slug,
    role: organizationMembers.role,
    characterId: organizationMembers.characterId,
  })
    .from(organizationMembers)
    .innerJoin(organizations, eq(organizationMembers.organizationId, organizations.id))
    .where(and(
      eq(organizationMembers.characterId, character.id),
      eq(organizations.campaignId, campaignId),
    ))
    .all()

  return memberships
})
