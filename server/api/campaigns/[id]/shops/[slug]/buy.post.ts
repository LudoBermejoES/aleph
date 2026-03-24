import { randomUUID } from 'crypto'
import { eq, and } from 'drizzle-orm'
import { useDb } from '../../../../../utils/db'
import { shops, shopStock, inventoryItems, wealth, transactions } from '../../../../../db/schema/inventory'
import { hasMinRole } from '../../../../../utils/permissions'
import type { CampaignRole } from '../../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const role = event.context.campaignRole as CampaignRole
  if (!hasMinRole(role, 'player')) throw createError({ statusCode: 403, message: 'Players or above can buy items' })

  const campaignId = getRouterParam(event, 'id')!
  const slug = getRouterParam(event, 'slug')!
  const body = await readBody(event)
  const { stockId, buyerInventoryId, buyerOwnerId, buyerOwnerType, quantity, currencyId } = body
  const db = useDb()

  const shop = db.select().from(shops).where(and(eq(shops.campaignId, campaignId), eq(shops.slug, slug))).get()
  if (!shop) throw createError({ statusCode: 404, message: 'Shop not found' })

  const stock = db.select().from(shopStock).where(eq(shopStock.id, stockId)).get()
  if (!stock || !stock.isAvailable) throw createError({ statusCode: 404, message: 'Stock item not available' })

  const qty = quantity || 1
  if (stock.quantity !== -1 && stock.quantity < qty) {
    throw createError({ statusCode: 400, message: 'Insufficient stock' })
  }

  // Deduct from buyer wealth
  const buyerWealth = db.select().from(wealth)
    .where(and(eq(wealth.ownerId, buyerOwnerId), eq(wealth.ownerType, buyerOwnerType), eq(wealth.currencyId, currencyId)))
    .get()

  const price = body.price || 0
  if (buyerWealth && buyerWealth.amount < price) {
    throw createError({ statusCode: 400, message: 'Insufficient funds' })
  }

  if (buyerWealth) {
    db.update(wealth).set({ amount: buyerWealth.amount - price }).where(eq(wealth.id, buyerWealth.id)).run()
  }

  // Decrement stock
  if (stock.quantity !== -1) {
    db.update(shopStock).set({ quantity: stock.quantity - qty }).where(eq(shopStock.id, stock.id)).run()
  }

  // Add item to buyer inventory
  const existing = db.select().from(inventoryItems)
    .where(and(eq(inventoryItems.inventoryId, buyerInventoryId), eq(inventoryItems.itemId, stock.itemId)))
    .get()

  if (existing) {
    db.update(inventoryItems).set({ quantity: existing.quantity + qty }).where(eq(inventoryItems.id, existing.id)).run()
  } else {
    db.insert(inventoryItems).values({
      id: randomUUID(), inventoryId: buyerInventoryId, itemId: stock.itemId,
      quantity: qty, position: 'backpack', acquiredAt: new Date(),
    }).run()
  }

  // Log transaction
  db.insert(transactions).values({
    id: randomUUID(), campaignId, type: 'purchase',
    fromEntityId: buyerOwnerId, toEntityId: shop.id,
    itemId: stock.itemId, quantity: qty,
    amountsJson: JSON.stringify({ [currencyId]: price }),
    createdAt: new Date(),
  }).run()

  return { success: true }
})
