import { eq, and, isNull, sql } from 'drizzle-orm'
import { useDb } from '../../../../utils/db'
import { maps } from '../../../../db/schema/maps'
import { parsePagination, buildMeta } from '../../../../utils/pagination'

export default defineEventHandler(async (event) => {
  const campaignId = getRouterParam(event, 'id')!
  const query = getQuery(event)
  const db = useDb()
  const pagination = parsePagination(query as Record<string, unknown>)

  const conditions: ReturnType<typeof eq>[] = [eq(maps.campaignId, campaignId)]
  if (query.parent_map_id) conditions.push(eq(maps.parentMapId, query.parent_map_id as string))
  else if (query.root === 'true') conditions.push(isNull(maps.parentMapId) as ReturnType<typeof eq>)

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
