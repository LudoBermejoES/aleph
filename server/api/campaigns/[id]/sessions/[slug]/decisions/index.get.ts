import { eq, and } from 'drizzle-orm'
import { useDb } from '../../../../../../utils/db'
import { gameSessions, decisions, consequences } from '../../../../../../db/schema/sessions'
import { hasMinRole } from '../../../../../../utils/permissions'
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

  // Attach consequences
  const isDm = hasMinRole(role, 'co_dm')
  const result = decisionList.map(d => {
    let cons = db.select().from(consequences)
      .where(eq(consequences.decisionId, d.id))
      .all()
    // Hide unrevealed consequences from non-DM
    if (!isDm) cons = cons.filter(c => c.revealed)
    return { ...d, consequences: cons }
  })

  return result
})
