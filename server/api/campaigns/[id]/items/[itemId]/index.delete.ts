import { eq, and } from 'drizzle-orm'
import { useDb } from '../../../../../utils/db'
import { items, inventoryItems, shopStock } from '../../../../../db/schema/inventory'
import { hasMinRole } from '../../../../../utils/permissions'
import type { CampaignRole } from '../../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const role = event.context.campaignRole as CampaignRole
  if (!hasMinRole(role, 'co_dm')) {
    throw createError({ statusCode: 403, message: 'Co-DM or above can delete items' })
  }

  const campaignId = getRouterParam(event, 'id')!
  const itemId = getRouterParam(event, 'itemId')!
  const db = useDb()

  const item = db.select().from(items)
    .where(and(eq(items.campaignId, campaignId), eq(items.id, itemId)))
    .get()
  if (!item) throw createError({ statusCode: 404, message: 'Item not found' })

  db.delete(inventoryItems).where(eq(inventoryItems.itemId, item.id)).run()
  db.delete(shopStock).where(eq(shopStock.itemId, item.id)).run()
  db.delete(items).where(eq(items.id, item.id)).run()

  return { success: true }
})
