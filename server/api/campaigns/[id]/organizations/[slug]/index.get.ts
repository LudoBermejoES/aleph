import { eq, and } from 'drizzle-orm'
import { useDb } from '../../../../../utils/db'
import { organizations, organizationMembers } from '../../../../../db/schema'
import { entities } from '../../../../../db/schema/entities'
import { characters } from '../../../../../db/schema/characters'
import {
  canUserAccessEntity,
  getCachedPermission,
  setCachedPermission,
} from '../../../../../utils/permissions'
import type { CampaignRole, Visibility } from '../../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const campaignId = getRouterParam(event, 'id')!
  const slug = getRouterParam(event, 'slug')!
  const role = (event.context.campaignRole || 'visitor') as CampaignRole
  const userId = event.context.user?.id || ''
  const db = useDb()

  const org = db
    .select()
    .from(organizations)
    .where(and(eq(organizations.campaignId, campaignId), eq(organizations.slug, slug)))
    .get()

  if (!org) {
    throw createError({ statusCode: 404, message: 'Organization not found' })
  }

  const entity = org.entityId
    ? db.select().from(entities).where(eq(entities.id, org.entityId)).get()
    : undefined

  if (entity) {
    const cached = getCachedPermission(userId, entity.id, 'view')
    const canAccess =
      cached !== null
        ? cached
        : await canUserAccessEntity(
            db,
            userId,
            'user',
            role,
            entity.id,
            entity.visibility as Visibility,
            entity.createdBy,
            'view',
          )
    if (cached === null) setCachedPermission(userId, entity.id, 'view', canAccess)
    if (!canAccess) throw createError({ statusCode: 404, message: 'Organization not found' })
  }

  const members = db
    .select({
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

  const fields = org.fieldsJson ? (JSON.parse(org.fieldsJson) as Record<string, unknown>) : {}

  return { ...org, visibility: entity?.visibility, fields, members }
})
