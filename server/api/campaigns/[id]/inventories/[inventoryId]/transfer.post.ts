import { randomUUID } from 'crypto'
import { eq, and } from 'drizzle-orm'
import { useDb } from '../../../../../utils/db'
import { inventories, inventoryItems, items, transactions } from '../../../../../db/schema/inventory'
import { characters } from '../../../../../db/schema/characters'
import { canTransferItem } from '../../../../../services/inventory'
import { hasMinRole } from '../../../../../utils/permissions'
import type { CampaignRole } from '../../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const role = event.context.campaignRole as CampaignRole
  if (!hasMinRole(role, 'player')) throw createError({ statusCode: 403, message: 'Players or above can transfer items' })

  const campaignId = getRouterParam(event, 'id')!
  const fromInventoryId = getRouterParam(event, 'inventoryId')!
  const userId = event.context.user?.id
  const body = await readBody(event)
  const { toInventoryId, itemId, quantity } = body
  const db = useDb()

  // RBAC: players can only manage inventories belonging to their own characters; DM/editor manage all
  if (role === 'player' && userId) {
    const sourceInv = db.select().from(inventories).where(eq(inventories.id, fromInventoryId)).get()
    if (sourceInv?.ownerType === 'character') {
      const ownerChar = db.select().from(characters)
        .where(and(eq(characters.id, sourceInv.ownerId), eq(characters.ownerUserId, userId)))
        .get()
      if (!ownerChar) throw createError({ statusCode: 403, message: 'You can only manage your own character\'s inventory' })
    }
  }

  // Validate source
  const sourceItem = db.select().from(inventoryItems)
    .where(and(eq(inventoryItems.inventoryId, fromInventoryId), eq(inventoryItems.itemId, itemId)))
    .get()

  if (!sourceItem) throw createError({ statusCode: 404, message: 'Item not found in source inventory' })

  const check = canTransferItem({ currentQuantity: sourceItem.quantity, transferQuantity: quantity })
  if (!check.allowed) throw createError({ statusCode: 400, message: check.error })

  // Validate target
  const targetInv = db.select().from(inventories).where(eq(inventories.id, toInventoryId)).get()
  if (!targetInv) throw createError({ statusCode: 404, message: 'Target inventory not found' })

  // Execute transfer
  const newSourceQty = sourceItem.quantity - quantity
  if (newSourceQty <= 0) {
    db.delete(inventoryItems).where(eq(inventoryItems.id, sourceItem.id)).run()
  } else {
    db.update(inventoryItems).set({ quantity: newSourceQty }).where(eq(inventoryItems.id, sourceItem.id)).run()
  }

  // Add to target (stack if possible)
  const item = db.select().from(items).where(eq(items.id, itemId)).get()
  const existingTarget = db.select().from(inventoryItems)
    .where(and(eq(inventoryItems.inventoryId, toInventoryId), eq(inventoryItems.itemId, itemId)))
    .get()

  if (existingTarget && item?.stackable) {
    db.update(inventoryItems)
      .set({ quantity: existingTarget.quantity + quantity })
      .where(eq(inventoryItems.id, existingTarget.id))
      .run()
  } else {
    db.insert(inventoryItems).values({
      id: randomUUID(),
      inventoryId: toInventoryId,
      itemId,
      quantity,
      position: 'backpack',
      acquiredAt: new Date(),
    }).run()
  }

  // Log transaction
  db.insert(transactions).values({
    id: randomUUID(),
    campaignId,
    type: 'trade',
    fromEntityId: fromInventoryId,
    toEntityId: toInventoryId,
    itemId,
    quantity,
    createdAt: new Date(),
  }).run()

  return { success: true }
})
