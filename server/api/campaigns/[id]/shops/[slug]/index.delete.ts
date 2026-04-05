import { eq, and } from 'drizzle-orm'
import { useDb } from '../../../../../utils/db'
import { shops, inventories, inventoryItems } from '../../../../../db/schema/inventory'
import { hasMinRole } from '../../../../../utils/permissions'
import type { CampaignRole } from '../../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const role = event.context.campaignRole as CampaignRole
  if (!hasMinRole(role, 'co_dm')) {
    throw createError({ statusCode: 403, message: 'Co-DM or above can delete shops' })
  }

  const campaignId = getRouterParam(event, 'id')!
  const slug = getRouterParam(event, 'slug')!
  const db = useDb()

  const shop = db
    .select()
    .from(shops)
    .where(and(eq(shops.campaignId, campaignId), eq(shops.slug, slug)))
    .get()
  if (!shop) throw createError({ statusCode: 404, message: 'Shop not found' })

  const shopInventories = db
    .select()
    .from(inventories)
    .where(and(eq(inventories.ownerType, 'shop'), eq(inventories.ownerId, shop.id)))
    .all()
  for (const inventory of shopInventories) {
    db.delete(inventoryItems).where(eq(inventoryItems.inventoryId, inventory.id)).run()
    db.delete(inventories).where(eq(inventories.id, inventory.id)).run()
  }

  // Cascade handles shop_stock
  db.delete(shops).where(eq(shops.id, shop.id)).run()

  return { success: true }
})
