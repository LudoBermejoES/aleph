import { eq, and } from 'drizzle-orm'
import { useDb } from '../../../../../utils/db'
import { items } from '../../../../../db/schema/inventory'
import { hasMinRole } from '../../../../../utils/permissions'
import type { CampaignRole } from '../../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const role = event.context.campaignRole as CampaignRole
  if (!hasMinRole(role, 'editor')) {
    throw createError({ statusCode: 403, message: 'Editors or above can update items' })
  }

  const campaignId = getRouterParam(event, 'id')!
  const itemId = getRouterParam(event, 'itemId')!
  const body = await readBody(event)
  const db = useDb()

  const item = db
    .select()
    .from(items)
    .where(and(eq(items.campaignId, campaignId), eq(items.id, itemId)))
    .get()
  if (!item) throw createError({ statusCode: 404, message: 'Item not found' })

  const updates: Record<string, unknown> = {}
  if (body.name !== undefined) updates.name = body.name
  if (body.description !== undefined) updates.description = body.description
  if (body.weight !== undefined) updates.weight = body.weight
  if (body.priceJson !== undefined) updates.priceJson = body.priceJson
  if (body.size !== undefined) updates.size = body.size
  if (body.rarity !== undefined) updates.rarity = body.rarity
  if (body.type !== undefined) updates.type = body.type
  if (body.propertiesJson !== undefined) updates.propertiesJson = body.propertiesJson
  if (body.stackable !== undefined) updates.stackable = body.stackable

  db.update(items).set(updates).where(eq(items.id, item.id)).run()

  return { success: true }
})
