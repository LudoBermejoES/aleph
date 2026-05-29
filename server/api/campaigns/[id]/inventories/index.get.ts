import { eq, inArray } from 'drizzle-orm'
import { useDb } from '../../../../utils/db'
import { inventories, inventoryItems, items } from '../../../../db/schema/inventory'

// Intentional raw array: inventories are scoped per campaign and always loaded in full.
// CLI and composable consumers depend on array shape — do not paginate.
export default defineEventHandler(async (event) => {
  const campaignId = getRouterParam(event, 'id')!
  const query = getQuery(event)
  const db = useDb()

  let results = db.select().from(inventories).where(eq(inventories.campaignId, campaignId)).all()

  if (query.owner_id) results = results.filter((i) => i.ownerId === query.owner_id)
  if (query.owner_type) results = results.filter((i) => i.ownerType === query.owner_type)

  if (results.length === 0) return []

  const invIds = results.map((i) => i.id)
  const allInvItems = db
    .select({
      id: inventoryItems.id,
      inventoryId: inventoryItems.inventoryId,
      itemId: inventoryItems.itemId,
      itemName: items.name,
      itemRarity: items.rarity,
      quantity: inventoryItems.quantity,
      position: inventoryItems.position,
      notes: inventoryItems.notes,
    })
    .from(inventoryItems)
    .innerJoin(items, eq(inventoryItems.itemId, items.id))
    .where(inArray(inventoryItems.inventoryId, invIds))
    .all()

  const itemsByInvId = new Map<string, typeof allInvItems>()
  for (const item of allInvItems) {
    if (!itemsByInvId.has(item.inventoryId)) itemsByInvId.set(item.inventoryId, [])
    itemsByInvId.get(item.inventoryId)!.push(item)
  }

  return results.map((inv) => ({ ...inv, items: itemsByInvId.get(inv.id) ?? [] }))
})
