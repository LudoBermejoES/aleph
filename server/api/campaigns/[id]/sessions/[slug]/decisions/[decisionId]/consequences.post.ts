import { z } from 'zod'
import { randomUUID } from 'crypto'
import { eq } from 'drizzle-orm'
import { useDb } from '../../../../../../../utils/db'
import { validateBody } from '../../../../../../../utils/validate'
import { decisions, consequences } from '../../../../../../../db/schema/sessions'
import { hasMinRole } from '../../../../../../../utils/permissions'
import type { CampaignRole } from '../../../../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const role = event.context.campaignRole as CampaignRole
  if (!hasMinRole(role, 'co_dm')) {
    throw createError({ statusCode: 403, message: 'Co-DM or above can add consequences' })
  }

  const decisionId = getRouterParam(event, 'decisionId')!
  const consequenceSchema = z.object({
    description: z.string().min(1),
    entityId: z.string().optional(),
    revealed: z.boolean().optional(),
  })
  const body = await validateBody(event, consequenceSchema)
  const db = useDb()

  const decision = db.select().from(decisions).where(eq(decisions.id, decisionId)).get()
  if (!decision) throw createError({ statusCode: 404, message: 'Decision not found' })

  const id = randomUUID()
  db.insert(consequences).values({
    id,
    decisionId,
    description: body.description,
    entityId: body.entityId || null,
    revealed: body.revealed || false,
  }).run()

  return { id, description: body.description, revealed: body.revealed || false }
})
