import { eq, and, sql, type SQL } from 'drizzle-orm'
import { useDb } from '../../../../utils/db'
import { organizations } from '../../../../db/schema'
import { entities } from '../../../../db/schema/entities'
import { parsePagination, buildMeta } from '../../../../utils/pagination'
import { buildVisibilityFilter } from '../../../../utils/permissions'
import type { CampaignRole } from '../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const campaignId = getRouterParam(event, 'id')!
  const query = getQuery(event)
  const db = useDb()
  const role = (event.context.campaignRole || 'visitor') as CampaignRole
  const userId = event.context.user?.id || ''
  const pagination = parsePagination(query as Record<string, unknown>)

  const conditions: SQL[] = [eq(organizations.campaignId, campaignId)]
  buildVisibilityFilter(role, userId, conditions, entities.visibility, entities.createdBy)

  const countRow = db
    .select({ total: sql<number>`COUNT(*)` })
    .from(organizations)
    .innerJoin(entities, eq(entities.id, organizations.entityId))
    .where(and(...conditions))
    .get()
  const total = countRow?.total ?? 0

  const data = db
    .select({
      id: organizations.id,
      entityId: organizations.entityId,
      name: organizations.name,
      slug: organizations.slug,
      description: organizations.description,
      type: organizations.type,
      status: organizations.status,
      visibility: entities.visibility,
      createdAt: organizations.createdAt,
      updatedAt: organizations.updatedAt,
      memberCount: sql<number>`(SELECT COUNT(*) FROM organization_members WHERE organization_id = ${organizations.id})`,
    })
    .from(organizations)
    .innerJoin(entities, eq(entities.id, organizations.entityId))
    .where(and(...conditions))
    .limit(pagination.limit)
    .offset(pagination.offset)
    .all()

  if (pagination.pageSize === 0) return data
  return { data, meta: buildMeta(total, pagination) }
})
