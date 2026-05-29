import { eq, and, inArray } from 'drizzle-orm'
import { useDb } from '../../../../../../utils/db'
import { gameSessions, decisions, consequences } from '../../../../../../db/schema/sessions'
import { filterRevealedConsequences } from '../../../../../../services/sessions'
import type { CampaignRole } from '../../../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const campaignId = getRouterParam(event, 'id')!
  const slug = getRouterParam(event, 'slug')!
  const role = event.context.campaignRole as CampaignRole
  const db = useDb()

  const session = db
    .select()
    .from(gameSessions)
    .where(and(eq(gameSessions.campaignId, campaignId), eq(gameSessions.slug, slug)))
    .get()
  if (!session) throw createError({ statusCode: 404, message: 'Session not found' })

  const decisionList = db.select().from(decisions).where(eq(decisions.sessionId, session.id)).all()
  if (decisionList.length === 0) return []

  const decisionIds = decisionList.map((d) => d.id)
  const allConsequences = db
    .select()
    .from(consequences)
    .where(inArray(consequences.decisionId, decisionIds))
    .all()

  const consequencesByDecId = new Map<string, typeof allConsequences>()
  for (const c of allConsequences) {
    if (!consequencesByDecId.has(c.decisionId)) consequencesByDecId.set(c.decisionId, [])
    consequencesByDecId.get(c.decisionId)!.push(c)
  }

  return decisionList.map((d) => ({
    ...d,
    consequences: filterRevealedConsequences(consequencesByDecId.get(d.id) ?? [], role),
  }))
})
