import { eq, and } from 'drizzle-orm'
import { useDb } from '../../../../utils/db'
import { currencies } from '../../../../db/schema/inventory'

export default defineEventHandler(async (event) => {
  const campaignId = getRouterParam(event, 'id')!
  const query = getQuery(event)
  const { from, to, amount } = query

  if (!from || !to || amount === undefined) {
    throw createError({ statusCode: 400, message: 'from, to, and amount are required' })
  }

  const db = useDb()
  const fromCurrency = db.select().from(currencies)
    .where(and(eq(currencies.id, from as string), eq(currencies.campaignId, campaignId)))
    .get()
  const toCurrency = db.select().from(currencies)
    .where(and(eq(currencies.id, to as string), eq(currencies.campaignId, campaignId)))
    .get()

  if (!fromCurrency) throw createError({ statusCode: 404, message: 'Source currency not found' })
  if (!toCurrency) throw createError({ statusCode: 404, message: 'Target currency not found' })

  const amountNum = Number(amount)
  if (isNaN(amountNum) || amountNum < 0) {
    throw createError({ statusCode: 400, message: 'amount must be a non-negative number' })
  }

  // Convert: amount * fromCurrency.valueInBase / toCurrency.valueInBase
  const converted = (amountNum * fromCurrency.valueInBase) / toCurrency.valueInBase

  return {
    from: { id: fromCurrency.id, name: fromCurrency.name, symbol: fromCurrency.symbol },
    to: { id: toCurrency.id, name: toCurrency.name, symbol: toCurrency.symbol },
    amount: amountNum,
    converted,
  }
})
