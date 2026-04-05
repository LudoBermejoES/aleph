import { z } from 'zod'
import { randomUUID } from 'crypto'
import { useDb } from '../../../../utils/db'
import { validateBody } from '../../../../utils/validate'
import { currencies } from '../../../../db/schema/inventory'
import { hasMinRole } from '../../../../utils/permissions'
import type { CampaignRole } from '../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const role = event.context.campaignRole as CampaignRole
  if (!hasMinRole(role, 'dm')) throw createError({ statusCode: 403, message: 'Only DM can create currencies' })

  const campaignId = getRouterParam(event, 'id')!
  const currencySchema = z.object({
    name: z.string().min(1),
    symbol: z.string().optional(),
    valueInBase: z.number().optional(),
    sortOrder: z.number().optional(),
  })
  const body = await validateBody(event, currencySchema)
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
