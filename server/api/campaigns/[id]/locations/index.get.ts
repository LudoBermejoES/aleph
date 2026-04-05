import { eq, and, like, sql } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import { useDb } from '../../../../utils/db'
import { entities } from '../../../../db/schema/entities'
import { buildVisibilityFilter } from '../../../../utils/permissions'
import { parsePagination, buildMeta } from '../../../../utils/pagination'
import type { CampaignRole } from '../../../../utils/permissions'

const parentEntities = alias(entities, 'parent_entities')

export default defineEventHandler(async (event) => {
  const campaignId = getRouterParam(event, 'id')!
  const query = getQuery(event)
  const db = useDb()
  const role = (event.context.campaignRole || 'visitor') as CampaignRole
  const userId = event.context.user?.id || ''

  const parentId = query.parentId as string | undefined
  const subtype = query.subtype as string | undefined
  const search = query.search as string | undefined

  const conditions = [
    eq(entities.campaignId, campaignId),
    eq(entities.type, 'location'),
  ]

  if (parentId) conditions.push(eq(entities.parentId, parentId))
  else if (query.parentId === '') conditions.push(sql`${entities.parentId} IS NULL`)

  if (search) conditions.push(like(entities.name, `%${search}%`))

  buildVisibilityFilter(role, userId, conditions, entities.visibility, entities.createdBy)

  const pagination = parsePagination(query as Record<string, unknown>)

  const countRow = db.select({ total: sql<number>`COUNT(*)` })
    .from(entities)
    .where(and(...conditions))
    .get()
  const total = countRow?.total ?? 0

  const results = db.select({
    id: entities.id,
    name: entities.name,
    slug: entities.slug,
    filePath: entities.filePath,
    parentId: entities.parentId,
    visibility: entities.visibility,
    updatedAt: entities.updatedAt,
    parentName: parentEntities.name,
    childCount: sql<number>`(SELECT COUNT(*) FROM entities child WHERE child.parent_id = ${entities.id} AND child.type = 'location' AND child.campaign_id = ${campaignId})`.as('child_count'),
    inhabitantCount: sql<number>`(SELECT COUNT(*) FROM characters c WHERE c.location_entity_id = ${entities.id})`.as('inhabitant_count'),
  })
    .from(entities)
    .leftJoin(parentEntities, eq(entities.parentId, parentEntities.id))
    .where(and(...conditions))
    .orderBy(entities.name)
    .limit(pagination.limit)
    .offset(pagination.offset)
    .all()

  const mapRow = (loc: typeof results[number], st = 'other') => ({
    id: loc.id,
    name: loc.name,
    slug: loc.slug,
    subtype: st,
    parentId: loc.parentId,
    parentName: loc.parentName ?? null,
    visibility: loc.visibility,
    updatedAt: loc.updatedAt,
    childCount: loc.childCount ?? 0,
    inhabitantCount: loc.inhabitantCount ?? 0,
  })

  const { safeReadEntityFile } = await import('../../../../utils/content-helpers')
  const withSubtypes = await Promise.all(results.map(async (loc) => {
    const file = await safeReadEntityFile(loc.filePath ?? '')
    const st = file?.frontmatter?.fields?.subtype as string ?? 'other'
    return { loc, st }
  }))

  let data: ReturnType<typeof mapRow>[]
  if (subtype) {
    data = withSubtypes
      .filter(({ st }) => st === subtype)
      .map(({ loc, st }) => mapRow(loc, st))
  } else {
    data = withSubtypes.map(({ loc, st }) => mapRow(loc, st))
  }

  if (pagination.pageSize === 0) return data
  return { data, meta: buildMeta(total, pagination) }
})
