import { z } from 'zod'
import { randomUUID } from 'crypto'
import { useDb } from '../../../utils/db'
import { validateBody } from '../../../utils/validate'
import { sessionRolls } from '../../../db/schema/rolls'
import { parseDiceFormula, evaluateDiceRoll, isValidFormula } from '../../../services/dice'
import { emitCampaignMessage } from '../../../utils/broadcast'

export default defineEventHandler(async (event) => {
  const campaignId = getRouterParam(event, 'id')!
  const rollSchema = z.object({
    formula: z.string().min(1),
    sessionId: z.string().optional(),
    characterId: z.string().optional(),
  })
  const body = await validateBody(event, rollSchema)
  const { formula, sessionId, characterId } = body

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
