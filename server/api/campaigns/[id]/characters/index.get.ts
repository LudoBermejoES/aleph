import { eq, and, desc, asc, sql, isNull } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import { useDb } from '../../../../utils/db'
import { entities } from '../../../../db/schema/entities'
import { characters } from '../../../../db/schema/characters'
import { organizations, organizationMembers } from '../../../../db/schema/organizations'
import { parsePagination, buildMeta } from '../../../../utils/pagination'
import { escapeLike } from '../../../../utils/sanitize'
import { withApiHandler } from '../../../../utils/api-handler'

const locationEntities = alias(entities, 'loc_entities')

export default defineEventHandler((event) =>
  withApiHandler(event, async () => {
    const campaignId = getRouterParam(event, 'id')!
    const query = getQuery(event)
    const db = useDb()

    const characterType = query.type as string | undefined
    const status = query.status as string | undefined
    const search = query.search as string | undefined
    const folderId = query.folderId as string | undefined
    const companionOf = query.companionOf as string | undefined
    const companions = query.companions as string | undefined
    const locationEntityId = query.locationEntityId as string | undefined
    const organizationId = query.organizationId as string | undefined
    const sortField = query.sort as string | undefined
    const sortDir = (query.sortDir as string | undefined) ?? 'desc'

    const sortColumns: Record<string, unknown> = {
      name: entities.name,
      updatedAt: entities.updatedAt,
      status: characters.status,
    }
    const sortCol = sortColumns[sortField ?? ''] ?? entities.updatedAt
    const order =
      sortDir === 'asc'
        ? asc(sortCol as Parameters<typeof asc>[0])
        : desc(sortCol as Parameters<typeof desc>[0])

    const conditions: ReturnType<typeof eq>[] = [eq(entities.campaignId, campaignId)]
    if (characterType) conditions.push(eq(characters.characterType, characterType))
    if (status) conditions.push(eq(characters.status, status))
    if (search)
      conditions.push(
        sql`${entities.name} LIKE ${'%' + escapeLike(search) + '%'} ESCAPE '\\'` as ReturnType<
          typeof eq
        >,
      )
    if (folderId) conditions.push(eq(characters.folderId, folderId))
    if (companionOf) conditions.push(eq(characters.isCompanionOf, companionOf))
    if (companions === 'false')
      conditions.push(isNull(characters.isCompanionOf) as ReturnType<typeof eq>)
    if (locationEntityId) conditions.push(eq(characters.locationEntityId, locationEntityId))
    if (organizationId) {
      conditions.push(
        sql`EXISTS (SELECT 1 FROM organization_members om WHERE om.character_id = ${characters.id} AND om.organization_id = ${organizationId})` as ReturnType<
          typeof eq
        >,
      )
    }

    const pagination = parsePagination(query as Record<string, unknown>)

    // Total count for pagination meta
    const countRow = db
      .select({ total: sql<number>`COUNT(*)` })
      .from(characters)
      .innerJoin(entities, eq(characters.entityId, entities.id))
      .where(and(...conditions))
      .get()
    const total = countRow?.total ?? 0

    const primaryOrgMember = alias(organizationMembers, 'pom')
    const primaryOrg = alias(organizations, 'po')

    const rows = db
      .select({
        id: characters.id,
        entityId: characters.entityId,
        name: entities.name,
        slug: entities.slug,
        characterType: characters.characterType,
        status: characters.status,
        visibility: entities.visibility,
        ownerUserId: characters.ownerUserId,
        isCompanionOf: characters.isCompanionOf,
        folderId: characters.folderId,
        portraitUrl: characters.portraitUrl,
        locationEntityId: characters.locationEntityId,
        updatedAt: entities.updatedAt,
        birthYear: characters.birthYear,
        deathYear: characters.deathYear,
        gender: characters.gender,
        locationName: locationEntities.name,
        primaryOrgName: primaryOrg.name,
        primaryOrgRole: primaryOrgMember.role,
      })
      .from(characters)
      .innerJoin(entities, eq(characters.entityId, entities.id))
      .leftJoin(locationEntities, eq(characters.locationEntityId, locationEntities.id))
      .leftJoin(
        primaryOrgMember,
        sql`${primaryOrgMember.characterId} = ${characters.id} AND ${primaryOrgMember.organizationId} = (SELECT organization_id FROM organization_members WHERE character_id = ${characters.id} LIMIT 1)`,
      )
      .leftJoin(primaryOrg, eq(primaryOrgMember.organizationId, primaryOrg.id))
      .where(and(...conditions))
      .orderBy(order)
      .limit(pagination.limit)
      .offset(pagination.offset)
      .all()

    const data = rows.map((r) => ({
      id: r.id,
      entityId: r.entityId,
      name: r.name,
      slug: r.slug,
      characterType: r.characterType,
      status: r.status,
      visibility: r.visibility,
      ownerUserId: r.ownerUserId,
      isCompanionOf: r.isCompanionOf,
      folderId: r.folderId,
      portraitUrl: r.portraitUrl,
      locationEntityId: r.locationEntityId,
      updatedAt: r.updatedAt,
      birthYear: r.birthYear ?? null,
      deathYear: r.deathYear ?? null,
      gender: r.gender ?? null,
      locationName: r.locationName ?? null,
      primaryOrg: r.primaryOrgName ? { name: r.primaryOrgName, role: r.primaryOrgRole } : null,
    }))

    // pageSize=0 means backward-compat (return flat array)
    if (pagination.pageSize === 0) return data
    return { data, meta: buildMeta(total, pagination) }
  }),
)
