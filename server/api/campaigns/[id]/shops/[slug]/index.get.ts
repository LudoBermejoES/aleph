import { eq, and } from 'drizzle-orm'
import { useDb } from '../../../../../utils/db'
import { shops, shopStock, items } from '../../../../../db/schema/inventory'

export default defineEventHandler(async (event) => {
  const campaignId = getRouterParam(event, 'id')!
  const slug = getRouterParam(event, 'slug')!
  const db = useDb()

  const shop = db.select().from(shops).where(and(eq(shops.campaignId, campaignId), eq(shops.slug, slug))).get()
  if (!shop) throw createError({ statusCode: 404, message: 'Shop not found' })

  const stock = db.select({
    id: shopStock.id,
    itemId: shopStock.itemId,
    itemName: items.name,
    itemRarity: items.rarity,
    itemPriceJson: items.priceJson,
    quantity: shopStock.quantity,
    priceOverrideJson: shopStock.priceOverrideJson,
    isAvailable: shopStock.isAvailable,
  })
    .from(shopStock)
    .innerJoin(items, eq(shopStock.itemId, items.id))
    .where(eq(shopStock.shopId, shop.id))
    .all()

  return { ...shop, stock }
})
