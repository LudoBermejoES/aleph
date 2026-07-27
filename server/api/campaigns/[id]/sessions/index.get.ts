import { eq, desc, and, sql, inArray, type SQL } from 'drizzle-orm'
import { useDb } from '../../../../utils/db'
import { gameSessions, sessionGroups, arcs, chapters } from '../../../../db/schema/sessions'
import { parsePagination, buildMeta } from '../../../../utils/pagination'
import { withApiHandler } from '../../../../utils/api-handler'

export default defineEventHandler((event) =>
  withApiHandler(event, async () => {
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

    // Arc filter, resolved to ids in SQL before pagination and counting so meta.total
    // reflects it. Unlike the write path (404), an unknown slug is an empty page — same
    // read-vs-write split groupSlug already has. An ambiguous slug stays permissive and
    // matches every arc carrying it: over-matching is visible in the output.
    let arcIds: string[] | undefined
    const arcSlug = query.arcSlug as string | undefined
    if (arcSlug) {
      const matches = db
        .select({ id: arcs.id })
        .from(arcs)
        .where(and(eq(arcs.campaignId, campaignId), eq(arcs.slug, arcSlug)))
        .all()
      if (matches.length === 0)
        return { data: [], meta: buildMeta(0, parsePagination(query as Record<string, unknown>)) }
      arcIds = matches.map((a) => a.id)
    }

    const status = query.status as string | undefined
    const conditions: SQL[] = [eq(gameSessions.campaignId, campaignId)]
    if (groupId) conditions.push(eq(gameSessions.groupId, groupId))
    if (arcIds) conditions.push(inArray(gameSessions.arcId, arcIds))
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
        arcName: arcs.name,
        chapterId: gameSessions.chapterId,
        chapterName: chapters.name,
        groupId: gameSessions.groupId,
        groupName: sessionGroups.name,
        createdAt: gameSessions.createdAt,
        updatedAt: gameSessions.updatedAt,
      })
      .from(gameSessions)
      .leftJoin(sessionGroups, eq(gameSessions.groupId, sessionGroups.id))
      .leftJoin(arcs, eq(gameSessions.arcId, arcs.id))
      .leftJoin(chapters, eq(gameSessions.chapterId, chapters.id))
      .where(and(...conditions))
      .orderBy(desc(gameSessions.sessionNumber))
      .limit(pagination.limit)
      .offset(pagination.offset)
      .all()

    if (pagination.pageSize === 0) return data
    return { data, meta: buildMeta(total, pagination) }
  }),
)
