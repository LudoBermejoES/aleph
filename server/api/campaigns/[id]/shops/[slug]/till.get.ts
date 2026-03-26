import { eq, and } from 'drizzle-orm'
import { useDb } from '../../../../../utils/db'
import { shops, wealth, currencies } from '../../../../../db/schema/inventory'
import { hasMinRole } from '../../../../../utils/permissions'
import type { CampaignRole } from '../../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const role = event.context.campaignRole as CampaignRole
  if (!hasMinRole(role, 'player')) throw createError({ statusCode: 403, message: 'Players or above can view shop till' })

  const campaignId = getRouterParam(event, 'id')!
  const slug = getRouterParam(event, 'slug')!
  const db = useDb()

  const shop = db.select().from(shops).where(and(eq(shops.campaignId, campaignId), eq(shops.slug, slug))).get()
  if (!shop) throw createError({ statusCode: 404, message: 'Shop not found' })
  if (!shop.isPlayerOwned) throw createError({ statusCode: 400, message: 'This shop is not player-owned' })

  // Players can only view their own shop's till
  const userId = event.context.user?.id
  if (role === 'player' && shop.ownedByUserId !== userId) {
    throw createError({ statusCode: 403, message: 'You can only view your own shop\'s till' })
  }

  const balances = db.select({
    currencyId: wealth.currencyId,
    currencyName: currencies.name,
    currencySymbol: currencies.symbol,
    amount: wealth.amount,
  })
    .from(wealth)
    .innerJoin(currencies, eq(wealth.currencyId, currencies.id))
    .where(and(eq(wealth.ownerId, shop.id), eq(wealth.ownerType, 'shop')))
    .all()

  return { shopId: shop.id, shopName: shop.name, till: balances }
})
