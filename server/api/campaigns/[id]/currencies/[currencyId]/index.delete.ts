import { eq, and } from 'drizzle-orm'
import { useDb } from '../../../../../utils/db'
import { currencies, wealth } from '../../../../../db/schema/inventory'
import { hasMinRole } from '../../../../../utils/permissions'
import type { CampaignRole } from '../../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const role = event.context.campaignRole as CampaignRole
  if (!hasMinRole(role, 'co_dm')) {
    throw createError({ statusCode: 403, message: 'Co-DM or above can delete currencies' })
  }

  const campaignId = getRouterParam(event, 'id')!
  const currencyId = getRouterParam(event, 'currencyId')!
  const db = useDb()

  const currency = db.select().from(currencies).where(and(eq(currencies.campaignId, campaignId), eq(currencies.id, currencyId))).get()
  if (!currency) throw createError({ statusCode: 404, message: 'Currency not found' })

  db.delete(wealth).where(eq(wealth.currencyId, currency.id)).run()
  db.delete(currencies).where(eq(currencies.id, currency.id)).run()

  return { success: true }
})
