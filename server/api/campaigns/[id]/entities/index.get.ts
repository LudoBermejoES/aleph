import { eq, and, like, sql, desc } from 'drizzle-orm'
import { useDb } from '../../../../utils/db'
import { entities } from '../../../../db/schema/entities'
import { entityTags } from '../../../../db/schema/entities'

export default defineEventHandler(async (event) => {
  const campaignId = getRouterParam(event, 'id')!
  const query = getQuery(event)
  const db = useDb()

  const type = query.type as string | undefined
  const tag = query.tag as string | undefined
  const visibility = query.visibility as string | undefined
  const parentId = query.parent_id as string | undefined
  const search = query.search as string | undefined
  const page = parseInt(query.page as string || '1', 10)
  const limit = Math.min(parseInt(query.limit as string || '50', 10), 100)
  const offset = (page - 1) * limit

  // Build WHERE conditions
  const conditions = [eq(entities.campaignId, campaignId)]

  if (type) conditions.push(eq(entities.type, type))
  if (visibility) conditions.push(eq(entities.visibility, visibility))
  if (parentId) conditions.push(eq(entities.parentId, parentId))
  if (search) conditions.push(like(entities.name, `%${search}%`))

  const where = conditions.length === 1 ? conditions[0] : and(...conditions)!

  // TODO: permission filtering (exclude entities user cannot see)

  const results = db.select().from(entities)
    .where(where)
    .orderBy(desc(entities.updatedAt))
    .limit(limit)
    .offset(offset)
    .all()

  const countResult = db.select({ count: sql<number>`count(*)` })
    .from(entities)
    .where(where)
    .get()

  return {
    entities: results,
    pagination: {
      page,
      limit,
      total: countResult?.count ?? 0,
      totalPages: Math.ceil((countResult?.count ?? 0) / limit),
    },
  }
})
