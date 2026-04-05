import { eq, desc, and, sql } from 'drizzle-orm'
import { useDb } from '../../../../utils/db'
import { gameSessions, sessionGroups } from '../../../../db/schema/sessions'
import { parsePagination, buildMeta } from '../../../../utils/pagination'

export default defineEventHandler(async (event) => {
  const campaignId = getRouterParam(event, 'id')!
  const query = getQuery(event)
  const db = useDb()

  let groupId: string | undefined
  const groupSlug = query.groupSlug as string | undefined
  if (groupSlug) {
    const group = db
      .select({ id: sessionGroups.id })
      .from(sessionGroups)
      .where(and(eq(sessionGroups.campaignId, campaignId), eq(sessionGroups.slug, groupSlug)))
      .get()
    if (!group)
      return { data: [], meta: buildMeta(0, parsePagination(query as Record<string, unknown>)) }
    groupId = group.id
  }

  const status = query.status as string | undefined
  const conditions: ReturnType<typeof eq>[] = [eq(gameSessions.campaignId, campaignId)]
  if (groupId) conditions.push(eq(gameSessions.groupId, groupId))
  if (status) conditions.push(eq(gameSessions.status, status))

  const pagination = parsePagination(query as Record<string, unknown>)

  const countRow = db
    .select({ total: sql<number>`COUNT(*)` })
    .from(gameSessions)
    .where(and(...conditions))
    .get()
  const total = countRow?.total ?? 0

  const data = db
    .select({
      id: gameSessions.id,
      campaignId: gameSessions.campaignId,
      title: gameSessions.title,
      slug: gameSessions.slug,
      sessionNumber: gameSessions.sessionNumber,
      scheduledDate: gameSessions.scheduledDate,
      status: gameSessions.status,
      summary: gameSessions.summary,
      arcId: gameSessions.arcId,
      chapterId: gameSessions.chapterId,
      groupId: gameSessions.groupId,
      groupName: sessionGroups.name,
      createdAt: gameSessions.createdAt,
      updatedAt: gameSessions.updatedAt,
    })
    .from(gameSessions)
    .leftJoin(sessionGroups, eq(gameSessions.groupId, sessionGroups.id))
    .where(and(...conditions))
    .orderBy(desc(gameSessions.sessionNumber))
    .limit(pagination.limit)
    .offset(pagination.offset)
    .all()

  if (pagination.pageSize === 0) return data
  return { data, meta: buildMeta(total, pagination) }
})
