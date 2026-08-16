import { eq, asc, and, sql, inArray, type SQL } from 'drizzle-orm'
import { useDb } from '../../../../utils/db'
import { gameSessions, subCampaigns, arcs, chapters } from '../../../../db/schema/sessions'
import { parsePagination, buildMeta } from '../../../../utils/pagination'
import { withApiHandler } from '../../../../utils/api-handler'

export default defineEventHandler((event) =>
  withApiHandler(event, async () => {
    const campaignId = getRouterParam(event, 'id')!
    const query = getQuery(event)
    const db = useDb()

    let subCampaignId: string | undefined
    const subCampaignSlug = query.subCampaignSlug as string | undefined
    if (subCampaignSlug) {
      const subCampaign = db
        .select({ id: subCampaigns.id })
        .from(subCampaigns)
        .where(and(eq(subCampaigns.campaignId, campaignId), eq(subCampaigns.slug, subCampaignSlug)))
        .get()
      if (!subCampaign)
        return { data: [], meta: buildMeta(0, parsePagination(query as Record<string, unknown>)) }
      subCampaignId = subCampaign.id
    }

    // Arc filter, resolved to ids in SQL before pagination and counting so meta.total
    // reflects it. Unlike the write path (404), an unknown slug is an empty page — same
    // read-vs-write split subCampaignSlug already has. An ambiguous slug stays permissive and
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
    if (subCampaignId) conditions.push(eq(gameSessions.subCampaignId, subCampaignId))
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
        subCampaignId: gameSessions.subCampaignId,
        subCampaignName: subCampaigns.name,
        createdAt: gameSessions.createdAt,
        updatedAt: gameSessions.updatedAt,
      })
      .from(gameSessions)
      .leftJoin(subCampaigns, eq(gameSessions.subCampaignId, subCampaigns.id))
      .leftJoin(arcs, eq(gameSessions.arcId, arcs.id))
      .leftJoin(chapters, eq(gameSessions.chapterId, chapters.id))
      .where(and(...conditions))
      // sessionNumber does NOT track real chronology in this campaign data (see
      // app/utils/session-order.ts and sesiones/berlin_en_tinieblas/arcs/README.md) — the
      // default order must be scheduledDate ascending, with undated sessions sorted last.
      .orderBy(
        sql`CASE WHEN ${gameSessions.scheduledDate} IS NULL THEN 1 ELSE 0 END`,
        asc(gameSessions.scheduledDate),
        asc(gameSessions.sessionNumber),
      )
      .limit(pagination.limit)
      .offset(pagination.offset)
      .all()

    if (pagination.pageSize === 0) return data
    return { data, meta: buildMeta(total, pagination) }
  }),
)
