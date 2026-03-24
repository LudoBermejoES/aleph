import { eq, and } from 'drizzle-orm'
import { useDb } from '../../../../utils/db'
import { inventories, inventoryItems, items } from '../../../../db/schema/inventory'

export default defineEventHandler(async (event) => {
  const campaignId = getRouterParam(event, 'id')!
  const query = getQuery(event)
  const db = useDb()

  let results = db.select().from(inventories)
    .where(eq(inventories.campaignId, campaignId))
    .all()

  if (query.owner_id) results = results.filter(i => i.ownerId === query.owner_id)
  if (query.owner_type) results = results.filter(i => i.ownerType === query.owner_type)

  // Attach items to each inventory
  return results.map(inv => {
    const invItems = db.select({
      id: inventoryItems.id,
      itemId: inventoryItems.itemId,
      itemName: items.name,
      itemRarity: items.rarity,
      quantity: inventoryItems.quantity,
      position: inventoryItems.position,
      notes: inventoryItems.notes,
    })
      .from(inventoryItems)
      .innerJoin(items, eq(inventoryItems.itemId, items.id))
      .where(eq(inventoryItems.inventoryId, inv.id))
      .all()
    return { ...inv, items: invItems }
  })
})
