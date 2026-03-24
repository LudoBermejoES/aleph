import { randomUUID } from 'crypto'
import { useDb } from '../../../../utils/db'
import { inventories } from '../../../../db/schema/inventory'
import { hasMinRole } from '../../../../utils/permissions'
import type { CampaignRole } from '../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const role = event.context.campaignRole as CampaignRole
  if (!hasMinRole(role, 'editor')) throw createError({ statusCode: 403, message: 'Editors or above can create inventories' })

  const campaignId = getRouterParam(event, 'id')!
  const body = await readBody(event)
  const db = useDb()
  const id = randomUUID()

  db.insert(inventories).values({
    id,
    campaignId,
    ownerType: body.ownerType || 'character',
    ownerId: body.ownerId,
    name: body.name || 'Inventory',
  }).run()

  return { id }
})
