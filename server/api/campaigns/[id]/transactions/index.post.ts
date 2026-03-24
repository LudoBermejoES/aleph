import { randomUUID } from 'crypto'
import { useDb } from '../../../../utils/db'
import { transactions } from '../../../../db/schema/inventory'
import { hasMinRole } from '../../../../utils/permissions'
import type { CampaignRole } from '../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const role = event.context.campaignRole as CampaignRole
  if (!hasMinRole(role, 'editor')) throw createError({ statusCode: 403, message: 'Editors or above can log transactions' })

  const campaignId = getRouterParam(event, 'id')!
  const body = await readBody(event)
  const db = useDb()
  const id = randomUUID()

  db.insert(transactions).values({
    id,
    campaignId,
    type: body.type || 'trade',
    fromEntityId: body.fromEntityId || null,
    toEntityId: body.toEntityId || null,
    itemId: body.itemId || null,
    quantity: body.quantity || null,
    amountsJson: body.amounts ? JSON.stringify(body.amounts) : null,
    notes: body.notes || null,
    createdAt: new Date(),
  }).run()

  return { id }
})
