import { eq, desc, and } from 'drizzle-orm'
import { useDb } from '../../../../utils/db'
import { gameSessions, sessionGroups } from '../../../../db/schema/sessions'

export default defineEventHandler(async (event) => {
  const campaignId = getRouterParam(event, 'id')!
  const query = getQuery(event)
  const db = useDb()

  // Resolve groupSlug to groupId if provided
  let groupId: string | undefined
  const groupSlug = query.groupSlug as string | undefined
  if (groupSlug) {
    const group = db.select({ id: sessionGroups.id }).from(sessionGroups)
      .where(and(eq(sessionGroups.campaignId, campaignId), eq(sessionGroups.slug, groupSlug)))
      .get()
    if (!group) return []
    groupId = group.id
  }

  const conditions = groupId
    ? and(eq(gameSessions.campaignId, campaignId), eq(gameSessions.groupId, groupId))
    : eq(gameSessions.campaignId, campaignId)

  let results = db.select({
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
    .where(conditions)
    .orderBy(desc(gameSessions.sessionNumber))
    .all()

  const status = query.status as string | undefined
  if (status) results = results.filter(s => s.status === status)

  return results
})
