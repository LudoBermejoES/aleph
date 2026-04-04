import { eq, and } from 'drizzle-orm'
import { useDb } from '../../../../../utils/db'
import { inventories } from '../../../../../db/schema/inventory'
import { hasMinRole } from '../../../../../utils/permissions'
import type { CampaignRole } from '../../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const role = event.context.campaignRole as CampaignRole
  if (!hasMinRole(role, 'co_dm')) throw createError({ statusCode: 403, message: 'Co-DM or above can delete inventories' })

  const campaignId = getRouterParam(event, 'id')!
  const inventoryId = getRouterParam(event, 'inventoryId')!
  const db = useDb()

  const inventory = db.select().from(inventories)
    .where(and(eq(inventories.campaignId, campaignId), eq(inventories.id, inventoryId)))
    .get()
  if (!inventory) throw createError({ statusCode: 404, message: 'Inventory not found' })

  db.delete(inventories).where(eq(inventories.id, inventoryId)).run()

  return { success: true }
})
