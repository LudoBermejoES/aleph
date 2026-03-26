import { randomUUID } from 'crypto'
import { eq, and } from 'drizzle-orm'
import { useDb } from '../../../../../utils/db'
import { shops, wealth, transactions } from '../../../../../db/schema/inventory'
import { hasMinRole } from '../../../../../utils/permissions'
import type { CampaignRole } from '../../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const role = event.context.campaignRole as CampaignRole
  if (!hasMinRole(role, 'player')) throw createError({ statusCode: 403, message: 'Players or above can withdraw from shop till' })

  const campaignId = getRouterParam(event, 'id')!
  const slug = getRouterParam(event, 'slug')!
  const body = await readBody(event)
  const { currencyId, amount, toOwnerId, toOwnerType } = body
  const db = useDb()

  if (!currencyId || !amount || amount <= 0) {
    throw createError({ statusCode: 400, message: 'currencyId and a positive amount are required' })
  }

  const shop = db.select().from(shops).where(and(eq(shops.campaignId, campaignId), eq(shops.slug, slug))).get()
  if (!shop) throw createError({ statusCode: 404, message: 'Shop not found' })
  if (!shop.isPlayerOwned) throw createError({ statusCode: 400, message: 'This shop is not player-owned' })

  // Only shop owner or DM/editor can withdraw
  const userId = event.context.user?.id
  if (role === 'player' && shop.ownedByUserId !== userId) {
    throw createError({ statusCode: 403, message: 'You can only withdraw from your own shop\'s till' })
  }

  // Check till balance
  const till = db.select().from(wealth)
    .where(and(eq(wealth.ownerId, shop.id), eq(wealth.ownerType, 'shop'), eq(wealth.currencyId, currencyId)))
    .get()

  if (!till || till.amount < amount) {
    throw createError({ statusCode: 400, message: 'Insufficient till balance' })
  }

  // Deduct from till
  db.update(wealth).set({ amount: till.amount - amount }).where(eq(wealth.id, till.id)).run()

  // Credit destination if provided
  if (toOwnerId && toOwnerType) {
    const dest = db.select().from(wealth)
      .where(and(eq(wealth.ownerId, toOwnerId), eq(wealth.ownerType, toOwnerType), eq(wealth.currencyId, currencyId)))
      .get()
    if (dest) {
      db.update(wealth).set({ amount: dest.amount + amount }).where(eq(wealth.id, dest.id)).run()
    } else {
      db.insert(wealth).values({ id: randomUUID(), ownerType: toOwnerType, ownerId: toOwnerId, currencyId, amount }).run()
    }
  }

  // Log transaction
  db.insert(transactions).values({
    id: randomUUID(),
    campaignId,
    type: 'withdrawal',
    fromEntityId: shop.id,
    toEntityId: toOwnerId || null,
    amountsJson: JSON.stringify({ [currencyId]: amount }),
    notes: `Withdrawal from shop till: ${shop.name}`,
    createdAt: new Date(),
  }).run()

  return { success: true, withdrawn: amount }
})
