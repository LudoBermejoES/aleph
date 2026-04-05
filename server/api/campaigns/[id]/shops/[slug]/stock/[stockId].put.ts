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
  const body = await readBody(event)
  const db = useDb()

  const shop = db
    .select()
    .from(shops)
    .where(and(eq(shops.campaignId, campaignId), eq(shops.slug, slug)))
    .get()
  if (!shop) throw createError({ statusCode: 404, message: 'Shop not found' })

  const entry = db
    .select()
    .from(shopStock)
    .where(and(eq(shopStock.id, stockId), eq(shopStock.shopId, shop.id)))
    .get()
  if (!entry) throw createError({ statusCode: 404, message: 'Stock entry not found' })

  const updates: Record<string, unknown> = {}
  if (body.quantity !== undefined) updates.quantity = body.quantity
  if (body.priceOverride !== undefined)
    updates.priceOverrideJson = body.priceOverride ? JSON.stringify(body.priceOverride) : null
  if (body.isAvailable !== undefined) updates.isAvailable = body.isAvailable

  if (Object.keys(updates).length > 0) {
    db.update(shopStock).set(updates).where(eq(shopStock.id, stockId)).run()
  }

  return db.select().from(shopStock).where(eq(shopStock.id, stockId)).get()
})
