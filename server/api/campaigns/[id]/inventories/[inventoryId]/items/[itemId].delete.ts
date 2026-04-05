import { eq, and } from 'drizzle-orm'
import { useDb } from '../../../../../../utils/db'
import { inventoryItems } from '../../../../../../db/schema/inventory'
import { hasMinRole } from '../../../../../../utils/permissions'
import type { CampaignRole } from '../../../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const role = event.context.campaignRole as CampaignRole
  if (!hasMinRole(role, 'editor'))
    throw createError({ statusCode: 403, message: 'Editors or above can remove inventory items' })

  const inventoryId = getRouterParam(event, 'inventoryId')!
  const itemId = getRouterParam(event, 'itemId')!
  const db = useDb()

  const inventoryItem = db
    .select()
    .from(inventoryItems)
    .where(and(eq(inventoryItems.id, itemId), eq(inventoryItems.inventoryId, inventoryId)))
    .get()
  if (!inventoryItem) throw createError({ statusCode: 404, message: 'Inventory item not found' })

  db.delete(inventoryItems).where(eq(inventoryItems.id, itemId)).run()

  return { success: true }
})
