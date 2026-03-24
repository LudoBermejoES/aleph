import { randomUUID } from 'crypto'
import { eq, and } from 'drizzle-orm'
import { useDb } from '../../../../../utils/db'
import { inventories, inventoryItems, items } from '../../../../../db/schema/inventory'
import { hasMinRole } from '../../../../../utils/permissions'
import type { CampaignRole } from '../../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const role = event.context.campaignRole as CampaignRole
  if (!hasMinRole(role, 'player')) throw createError({ statusCode: 403, message: 'Players or above can manage inventory' })

  const inventoryId = getRouterParam(event, 'inventoryId')!
  const body = await readBody(event)
  const db = useDb()

  const inv = db.select().from(inventories).where(eq(inventories.id, inventoryId)).get()
  if (!inv) throw createError({ statusCode: 404, message: 'Inventory not found' })

  // Check if stackable item already exists
  const item = db.select().from(items).where(eq(items.id, body.itemId)).get()
  if (!item) throw createError({ statusCode: 404, message: 'Item not found' })

  if (item.stackable) {
    const existing = db.select().from(inventoryItems)
      .where(and(eq(inventoryItems.inventoryId, inventoryId), eq(inventoryItems.itemId, body.itemId)))
      .get()

    if (existing) {
      db.update(inventoryItems)
        .set({ quantity: existing.quantity + (body.quantity || 1) })
        .where(eq(inventoryItems.id, existing.id))
        .run()
      return { id: existing.id, stacked: true }
    }
  }

  const id = randomUUID()
  db.insert(inventoryItems).values({
    id,
    inventoryId,
    itemId: body.itemId,
    quantity: body.quantity || 1,
    position: body.position || 'backpack',
    notes: body.notes || null,
    acquiredAt: new Date(),
  }).run()

  return { id, stacked: false }
})
