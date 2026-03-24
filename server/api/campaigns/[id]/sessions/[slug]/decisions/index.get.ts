import { eq, and } from 'drizzle-orm'
import { useDb } from '../../../../../../utils/db'
import { gameSessions, decisions, consequences } from '../../../../../../db/schema/sessions'
import { filterRevealedConsequences } from '../../../../../../services/sessions'
import type { CampaignRole } from '../../../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const campaignId = getRouterParam(event, 'id')!
  const slug = getRouterParam(event, 'slug')!
  const role = event.context.campaignRole as CampaignRole
  const db = useDb()

  const session = db.select().from(gameSessions)
    .where(and(eq(gameSessions.campaignId, campaignId), eq(gameSessions.slug, slug)))
    .get()
  if (!session) throw createError({ statusCode: 404, message: 'Session not found' })

  const decisionList = db.select().from(decisions)
    .where(eq(decisions.sessionId, session.id))
    .all()

  const result = decisionList.map(d => {
    const allCons = db.select().from(consequences)
      .where(eq(consequences.decisionId, d.id))
      .all()
    return { ...d, consequences: filterRevealedConsequences(allCons, role) }
  })

  return result
})
