import { randomUUID } from 'crypto'
import { useDb } from '../../../../utils/db'
import { currencies } from '../../../../db/schema/inventory'
import { hasMinRole } from '../../../../utils/permissions'
import type { CampaignRole } from '../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const role = event.context.campaignRole as CampaignRole
  if (!hasMinRole(role, 'dm')) throw createError({ statusCode: 403, message: 'Only DM can create currencies' })

  const campaignId = getRouterParam(event, 'id')!
  const body = await readBody(event)
  const db = useDb()
  const id = randomUUID()

  db.insert(currencies).values({
    id,
    campaignId,
    name: body.name,
    symbol: body.symbol || null,
    valueInBase: body.valueInBase || 1,
    sortOrder: body.sortOrder || 0,
  }).run()

  return { id, name: body.name }
})
