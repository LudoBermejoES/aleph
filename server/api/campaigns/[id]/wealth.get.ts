import { eq, and } from 'drizzle-orm'
import { useDb } from '../../../utils/db'
import { wealth, currencies } from '../../../db/schema/inventory'

export default defineEventHandler(async (event) => {
  const campaignId = getRouterParam(event, 'id')!
  const query = getQuery(event)
  const db = useDb()

  if (!query.owner_id || !query.owner_type) {
    throw createError({ statusCode: 400, message: 'owner_id and owner_type required' })
  }

  const balances = db.select({
    id: wealth.id,
    currencyId: wealth.currencyId,
    currencyName: currencies.name,
    currencySymbol: currencies.symbol,
    amount: wealth.amount,
  })
    .from(wealth)
    .innerJoin(currencies, eq(wealth.currencyId, currencies.id))
    .where(and(
      eq(wealth.ownerId, query.owner_id as string),
      eq(wealth.ownerType, query.owner_type as string),
    ))
    .all()

  return balances
})
