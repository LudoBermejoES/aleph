import { randomUUID } from 'crypto'
import { useDb } from '../../../utils/db'
import { sessionRolls } from '../../../db/schema/rolls'
import { parseDiceFormula, evaluateDiceRoll, isValidFormula } from '../../../services/dice'
import { emitCampaignMessage } from '../../../utils/broadcast'

export default defineEventHandler(async (event) => {
  const campaignId = getRouterParam(event, 'id')!
  const body = await readBody(event)
  const { formula, sessionId, characterId } = body

  if (!formula?.trim()) {
    throw createError({ statusCode: 400, message: 'Formula is required' })
  }

  if (!isValidFormula(formula)) {
    throw createError({ statusCode: 400, message: `Invalid dice formula: "${formula}"` })
  }

  const ast = parseDiceFormula(formula)
  const result = evaluateDiceRoll(ast)

  // Log to session if sessionId provided
  if (sessionId) {
    const db = useDb()
    db.insert(sessionRolls).values({
      id: randomUUID(),
      campaignId,
      sessionId,
      userId: event.context.user.id,
      characterId: characterId || null,
      formula,
      resultJson: JSON.stringify(result),
      total: result.total,
      createdAt: new Date(),
    }).run()
  }

  // Broadcast to all connected campaign members (graceful: no-ops if WS unavailable)
  emitCampaignMessage(campaignId, {
    type: 'dice:roll',
    userId: event.context.user?.id,
    formula,
    result,
  })

  return result
})
