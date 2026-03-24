import { randomUUID } from 'crypto'
import { useDb } from '../../../../utils/db'
import { items } from '../../../../db/schema/inventory'
import { hasMinRole } from '../../../../utils/permissions'
import type { CampaignRole } from '../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const role = event.context.campaignRole as CampaignRole
  if (!hasMinRole(role, 'editor')) throw createError({ statusCode: 403, message: 'Editors or above can create items' })

  const campaignId = getRouterParam(event, 'id')!
  const body = await readBody(event)
  const db = useDb()
  const id = randomUUID()

  db.insert(items).values({
    id,
    campaignId,
    name: body.name,
    description: body.description || null,
    weight: body.weight || null,
    priceJson: body.price ? JSON.stringify(body.price) : null,
    size: body.size || null,
    rarity: body.rarity || 'common',
    type: body.type || null,
    propertiesJson: body.properties ? JSON.stringify(body.properties) : null,
    stackable: body.stackable ?? true,
    createdAt: new Date(),
  }).run()

  return { id, name: body.name }
})
