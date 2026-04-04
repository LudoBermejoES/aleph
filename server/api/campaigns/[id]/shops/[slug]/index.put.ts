import { eq, and } from 'drizzle-orm'
import { useDb } from '../../../../../utils/db'
import { shops } from '../../../../../db/schema/inventory'
import { hasMinRole } from '../../../../../utils/permissions'
import type { CampaignRole } from '../../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const role = event.context.campaignRole as CampaignRole
  if (!hasMinRole(role, 'editor')) {
    throw createError({ statusCode: 403, message: 'Editors or above can update shops' })
  }

  const campaignId = getRouterParam(event, 'id')!
  const slug = getRouterParam(event, 'slug')!
  const body = await readBody(event)
  const db = useDb()

  const shop = db.select().from(shops).where(and(eq(shops.campaignId, campaignId), eq(shops.slug, slug))).get()
  if (!shop) throw createError({ statusCode: 404, message: 'Shop not found' })

  const updates: Record<string, unknown> = {}
  if (body.name !== undefined) updates.name = body.name
  if (body.description !== undefined) updates.description = body.description
  if (body.locationEntityId !== undefined) updates.locationEntityId = body.locationEntityId
  if (body.shopkeeperEntityId !== undefined) updates.shopkeeperEntityId = body.shopkeeperEntityId
  if (body.isPlayerOwned !== undefined) updates.isPlayerOwned = body.isPlayerOwned

  if (Object.keys(updates).length > 0) {
    db.update(shops).set(updates).where(eq(shops.id, shop.id)).run()
  }

  return { success: true }
})
