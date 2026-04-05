import { eq, and } from 'drizzle-orm'
import { useDb } from '../../../../../../utils/db'
import { shops, shopStock } from '../../../../../../db/schema/inventory'
import { hasMinRole } from '../../../../../../utils/permissions'
import type { CampaignRole } from '../../../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const role = event.context.campaignRole as CampaignRole
  if (!hasMinRole(role, 'editor')) {
    throw createError({ statusCode: 403, message: 'Editors or above can manage stock' })
  }

  const campaignId = getRouterParam(event, 'id')!
  const slug = getRouterParam(event, 'slug')!
  const stockId = getRouterParam(event, 'stockId')!
  const db = useDb()

  const shop = db.select().from(shops).where(and(eq(shops.campaignId, campaignId), eq(shops.slug, slug))).get()
  if (!shop) throw createError({ statusCode: 404, message: 'Shop not found' })

  const entry = db.select().from(shopStock).where(and(eq(shopStock.id, stockId), eq(shopStock.shopId, shop.id))).get()
  if (!entry) throw createError({ statusCode: 404, message: 'Stock entry not found' })

  db.delete(shopStock).where(eq(shopStock.id, stockId)).run()

  setResponseStatus(event, 204)
  return null
})
