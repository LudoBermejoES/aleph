import { eq, and } from 'drizzle-orm'
import { useDb } from '../../../../../utils/db'
import { currencies } from '../../../../../db/schema/inventory'
import { hasMinRole } from '../../../../../utils/permissions'
import type { CampaignRole } from '../../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const role = event.context.campaignRole as CampaignRole
  if (!hasMinRole(role, 'editor')) {
    throw createError({ statusCode: 403, message: 'Editors or above can update currencies' })
  }

  const campaignId = getRouterParam(event, 'id')!
  const currencyId = getRouterParam(event, 'currencyId')!
  const body = await readBody(event)
  const db = useDb()

  const currency = db
    .select()
    .from(currencies)
    .where(and(eq(currencies.campaignId, campaignId), eq(currencies.id, currencyId)))
    .get()
  if (!currency) throw createError({ statusCode: 404, message: 'Currency not found' })

  const updates: Record<string, unknown> = {}
  if (body.name !== undefined) updates.name = body.name
  if (body.symbol !== undefined) updates.symbol = body.symbol
  if (body.valueInBase !== undefined) updates.valueInBase = body.valueInBase
  if (body.sortOrder !== undefined) updates.sortOrder = body.sortOrder

  if (Object.keys(updates).length > 0) {
    db.update(currencies).set(updates).where(eq(currencies.id, currency.id)).run()
  }

  return { success: true }
})
