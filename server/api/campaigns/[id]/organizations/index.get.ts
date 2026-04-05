import { eq, sql } from 'drizzle-orm'
import { useDb } from '../../../../utils/db'
import { organizations } from '../../../../db/schema'
import { parsePagination, buildMeta } from '../../../../utils/pagination'

export default defineEventHandler(async (event) => {
  const campaignId = getRouterParam(event, 'id')!
  const query = getQuery(event)
  const db = useDb()
  const pagination = parsePagination(query as Record<string, unknown>)

  const countRow = db.select({ total: sql<number>`COUNT(*)` })
    .from(organizations)
    .where(eq(organizations.campaignId, campaignId))
    .get()
  const total = countRow?.total ?? 0

  const data = db.select({
    id: organizations.id,
    name: organizations.name,
    slug: organizations.slug,
    description: organizations.description,
    type: organizations.type,
    status: organizations.status,
    createdAt: organizations.createdAt,
    updatedAt: organizations.updatedAt,
    memberCount: sql<number>`(SELECT COUNT(*) FROM organization_members WHERE organization_id = ${organizations.id})`,
  })
    .from(organizations)
    .where(eq(organizations.campaignId, campaignId))
    .limit(pagination.limit)
    .offset(pagination.offset)
    .all()

  if (pagination.pageSize === 0) return data
  return { data, meta: buildMeta(total, pagination) }
})
