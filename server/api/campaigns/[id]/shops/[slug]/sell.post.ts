import { randomUUID } from 'crypto'
import { eq, and } from 'drizzle-orm'
import { useDb } from '../../../../../utils/db'
import { shops, shopStock, inventoryItems, wealth, transactions } from '../../../../../db/schema/inventory'
import { hasMinRole } from '../../../../../utils/permissions'
import type { CampaignRole } from '../../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const role = event.context.campaignRole as CampaignRole
  if (!hasMinRole(role, 'player')) throw createError({ statusCode: 403, message: 'Players or above can sell items' })

  const campaignId = getRouterParam(event, 'id')!
  const slug = getRouterParam(event, 'slug')!
  const body = await readBody(event)
  const { sellerInventoryId, sellerOwnerId, sellerOwnerType, itemId, quantity, currencyId, price } = body
  const db = useDb()

  const shop = db.select().from(shops).where(and(eq(shops.campaignId, campaignId), eq(shops.slug, slug))).get()
  if (!shop) throw createError({ statusCode: 404, message: 'Shop not found' })

  const qty = quantity || 1

  // Remove from seller inventory
  const sellerItem = db.select().from(inventoryItems)
    .where(and(eq(inventoryItems.inventoryId, sellerInventoryId), eq(inventoryItems.itemId, itemId)))
    .get()
  if (!sellerItem || sellerItem.quantity < qty) {
    throw createError({ statusCode: 400, message: 'Insufficient items to sell' })
  }

  if (sellerItem.quantity === qty) {
    db.delete(inventoryItems).where(eq(inventoryItems.id, sellerItem.id)).run()
  } else {
    db.update(inventoryItems).set({ quantity: sellerItem.quantity - qty }).where(eq(inventoryItems.id, sellerItem.id)).run()
  }

  // Add wealth to seller
  if (price && currencyId) {
    const sellerWealth = db.select().from(wealth)
      .where(and(eq(wealth.ownerId, sellerOwnerId), eq(wealth.ownerType, sellerOwnerType), eq(wealth.currencyId, currencyId)))
      .get()
    if (sellerWealth) {
      db.update(wealth).set({ amount: sellerWealth.amount + price }).where(eq(wealth.id, sellerWealth.id)).run()
    } else {
      db.insert(wealth).values({ id: randomUUID(), ownerType: sellerOwnerType, ownerId: sellerOwnerId, currencyId, amount: price }).run()
    }
  }

  // Log transaction
  db.insert(transactions).values({
    id: randomUUID(), campaignId, type: 'sale',
    fromEntityId: sellerOwnerId, toEntityId: shop.id,
    itemId, quantity: qty,
    amountsJson: price && currencyId ? JSON.stringify({ [currencyId]: price }) : null,
    createdAt: new Date(),
  }).run()

  return { success: true }
})
