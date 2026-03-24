import { eq, and, desc } from 'drizzle-orm'
import { useDb } from '../../../../../utils/db'
import { gameSessions } from '../../../../../db/schema/sessions'
import { sessionRolls } from '../../../../../db/schema/rolls'
import { user } from '../../../../../db/schema/auth'

export default defineEventHandler(async (event) => {
  const campaignId = getRouterParam(event, 'id')!
  const slug = getRouterParam(event, 'slug')!
  const db = useDb()

  const session = db.select().from(gameSessions)
    .where(and(eq(gameSessions.campaignId, campaignId), eq(gameSessions.slug, slug)))
    .get()
  if (!session) throw createError({ statusCode: 404, message: 'Session not found' })

  const rolls = db.select({
    id: sessionRolls.id,
    formula: sessionRolls.formula,
    resultJson: sessionRolls.resultJson,
    total: sessionRolls.total,
    userName: user.name,
    characterId: sessionRolls.characterId,
    createdAt: sessionRolls.createdAt,
  })
    .from(sessionRolls)
    .innerJoin(user, eq(sessionRolls.userId, user.id))
    .where(eq(sessionRolls.sessionId, session.id))
    .orderBy(desc(sessionRolls.createdAt))
    .limit(50)
    .all()

  return rolls
})
