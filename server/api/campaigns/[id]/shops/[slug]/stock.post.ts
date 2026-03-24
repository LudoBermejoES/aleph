import { randomUUID } from 'crypto'
import { eq, and } from 'drizzle-orm'
import { useDb } from '../../../../../utils/db'
import { shops, shopStock } from '../../../../../db/schema/inventory'
import { hasMinRole } from '../../../../../utils/permissions'
import type { CampaignRole } from '../../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const role = event.context.campaignRole as CampaignRole
  if (!hasMinRole(role, 'editor')) throw createError({ statusCode: 403, message: 'Editors or above can manage stock' })

  const campaignId = getRouterParam(event, 'id')!
  const slug = getRouterParam(event, 'slug')!
  const body = await readBody(event)
  const db = useDb()

  const shop = db.select().from(shops).where(and(eq(shops.campaignId, campaignId), eq(shops.slug, slug))).get()
  if (!shop) throw createError({ statusCode: 404, message: 'Shop not found' })

  const id = randomUUID()
  db.insert(shopStock).values({
    id,
    shopId: shop.id,
    itemId: body.itemId,
    quantity: body.quantity ?? -1,
    priceOverrideJson: body.priceOverride ? JSON.stringify(body.priceOverride) : null,
    isAvailable: body.isAvailable ?? true,
  }).run()

  return { id }
})
