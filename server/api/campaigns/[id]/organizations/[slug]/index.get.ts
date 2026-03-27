import { eq, and } from 'drizzle-orm'
import { useDb } from '../../../../../utils/db'
import { organizations, organizationMembers } from '../../../../../db/schema'
import { entities } from '../../../../../db/schema/entities'
import { characters } from '../../../../../db/schema/characters'

export default defineEventHandler(async (event) => {
  const campaignId = getRouterParam(event, 'id')!
  const slug = getRouterParam(event, 'slug')!
  const db = useDb()

  const org = db.select()
    .from(organizations)
    .where(and(eq(organizations.campaignId, campaignId), eq(organizations.slug, slug)))
    .get()

  if (!org) {
    throw createError({ statusCode: 404, message: 'Organization not found' })
  }

  const members = db.select({
    characterId: organizationMembers.characterId,
    role: organizationMembers.role,
    characterName: entities.name,
    characterSlug: entities.slug,
  })
    .from(organizationMembers)
    .innerJoin(characters, eq(organizationMembers.characterId, characters.id))
    .innerJoin(entities, eq(characters.entityId, entities.id))
    .where(eq(organizationMembers.organizationId, org.id))
    .all()

  return { ...org, members }
})
