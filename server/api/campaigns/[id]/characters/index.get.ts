import { eq, and, like, desc, asc, sql, isNull } from 'drizzle-orm'
import { useDb } from '../../../../utils/db'
import { entities } from '../../../../db/schema/entities'
import { characters } from '../../../../db/schema/characters'

export default defineEventHandler(async (event) => {
  const campaignId = getRouterParam(event, 'id')!
  const query = getQuery(event)
  const db = useDb()

  const characterType = query.type as string | undefined
  const status = query.status as string | undefined
  const search = query.search as string | undefined
  const folderId = query.folderId as string | undefined
  const companionOf = query.companionOf as string | undefined
  const companions = query.companions as string | undefined
  const race = query.race as string | undefined
  const cls = query.class as string | undefined
  const alignment = query.alignment as string | undefined
  const locationEntityId = query.locationEntityId as string | undefined
  const organizationId = query.organizationId as string | undefined
  const sortField = query.sort as string | undefined
  const sortDir = (query.sortDir as string | undefined) ?? 'desc'

  // Resolve sort column; unknown fields fall back to updatedAt desc
  const sortColumns: Record<string, any> = {
    name: entities.name,
    updatedAt: entities.updatedAt,
    status: characters.status,
    race: characters.race,
    class: characters.class,
  }
  const sortCol = sortColumns[sortField ?? ''] ?? entities.updatedAt
  const order = sortDir === 'asc' ? asc(sortCol) : desc(sortCol)

  // Build WHERE conditions server-side
  const conditions: any[] = [eq(entities.campaignId, campaignId)]
  if (characterType) conditions.push(eq(characters.characterType, characterType))
  if (status) conditions.push(eq(characters.status, status))
  if (search) conditions.push(like(entities.name, `%${search}%`))
  if (folderId) conditions.push(eq(characters.folderId, folderId))
  if (companionOf) conditions.push(eq(characters.isCompanionOf, companionOf))
  if (companions === 'false') conditions.push(isNull(characters.isCompanionOf))
  if (race) conditions.push(eq(characters.race, race))
  if (cls) conditions.push(eq(characters.class, cls))
  if (alignment) conditions.push(eq(characters.alignment, alignment))
  if (locationEntityId) conditions.push(eq(characters.locationEntityId, locationEntityId))
  if (organizationId) {
    conditions.push(
      sql`EXISTS (SELECT 1 FROM organization_members om WHERE om.character_id = ${characters.id} AND om.organization_id = ${organizationId})`
    )
  }

  const rows = db.select({
    id: characters.id,
    entityId: characters.entityId,
    name: entities.name,
    slug: entities.slug,
    characterType: characters.characterType,
    race: characters.race,
    class: characters.class,
    alignment: characters.alignment,
    status: characters.status,
    visibility: entities.visibility,
    ownerUserId: characters.ownerUserId,
    isCompanionOf: characters.isCompanionOf,
    folderId: characters.folderId,
    portraitUrl: characters.portraitUrl,
    locationEntityId: characters.locationEntityId,
    updatedAt: entities.updatedAt,
    locationName: sql<string | null>`(SELECT e.name FROM entities e WHERE e.id = ${characters.locationEntityId})`.as('location_name'),
    primaryOrgName: sql<string | null>`(SELECT o.name FROM organization_members om JOIN organizations o ON om.organization_id = o.id WHERE om.character_id = ${characters.id} LIMIT 1)`.as('primary_org_name'),
    primaryOrgRole: sql<string | null>`(SELECT om.role FROM organization_members om JOIN organizations o ON om.organization_id = o.id WHERE om.character_id = ${characters.id} LIMIT 1)`.as('primary_org_role'),
  })
    .from(characters)
    .innerJoin(entities, eq(characters.entityId, entities.id))
    .where(and(...conditions))
    .orderBy(order)
    .all()

  return rows.map(r => ({
    id: r.id,
    entityId: r.entityId,
    name: r.name,
    slug: r.slug,
    characterType: r.characterType,
    race: r.race,
    class: r.class,
    alignment: r.alignment,
    status: r.status,
    visibility: r.visibility,
    ownerUserId: r.ownerUserId,
    isCompanionOf: r.isCompanionOf,
    folderId: r.folderId,
    portraitUrl: r.portraitUrl,
    locationEntityId: r.locationEntityId,
    updatedAt: r.updatedAt,
    locationName: r.locationName ?? null,
    primaryOrg: r.primaryOrgName ? { name: r.primaryOrgName, role: r.primaryOrgRole } : null,
  }))
})
