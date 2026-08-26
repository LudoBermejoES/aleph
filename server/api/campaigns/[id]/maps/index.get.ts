import { eq, and, isNull, sql } from 'drizzle-orm'
import type { SQL } from 'drizzle-orm'
import { useDb } from '../../../../utils/db'
import { maps } from '../../../../db/schema/maps'
import { parsePagination, buildMeta } from '../../../../utils/pagination'
import { buildMapVisibilityFilter } from '../../../../services/maps'
import type { CampaignRole } from '../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const campaignId = getRouterParam(event, 'id')!
  const query = getQuery(event)
  const db = useDb()
  const pagination = parsePagination(query as Record<string, unknown>)
  const role = (event.context.campaignRole || 'visitor') as CampaignRole

  const conditions: SQL[] = [eq(maps.campaignId, campaignId)]
  if (query.parent_map_id) conditions.push(eq(maps.parentMapId, query.parent_map_id as string))
  else if (query.root === 'true') conditions.push(isNull(maps.parentMapId) as SQL)

  // Design D2: maps the viewer's role may not see are simply absent -- no count, no
  // placeholder. Applied before both the count and the page query so `meta.total` and the
  // returned rows stay consistent with each other.
  buildMapVisibilityFilter(role, conditions)

  const countRow = db
    .select({ total: sql<number>`COUNT(*)` })
    .from(maps)
    .where(and(...conditions))
    .get()
  const total = countRow?.total ?? 0

  const data = db
    .select()
    .from(maps)
    .where(and(...conditions))
    .limit(pagination.limit)
    .offset(pagination.offset)
    .all()

  if (pagination.pageSize === 0) return data
  return { data, meta: buildMeta(total, pagination) }
})
