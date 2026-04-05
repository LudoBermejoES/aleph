import { z } from 'zod'
import { randomUUID } from 'crypto'
import { useDb } from '../../../../utils/db'
import { validateBody } from '../../../../utils/validate'
import { items } from '../../../../db/schema/inventory'
import { hasMinRole } from '../../../../utils/permissions'
import type { CampaignRole } from '../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const role = event.context.campaignRole as CampaignRole
  if (!hasMinRole(role, 'editor')) throw createError({ statusCode: 403, message: 'Editors or above can create items' })

  const campaignId = getRouterParam(event, 'id')!
  const itemSchema = z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    weight: z.union([z.number(), z.string().transform(v => v === '' ? undefined : parseFloat(v) || undefined)]).optional(),
    price: z.record(z.string(), z.number()).optional(),
    size: z.string().optional(),
    rarity: z.string().optional(),
    type: z.string().optional(),
    properties: z.record(z.string(), z.unknown()).optional(),
    stackable: z.boolean().optional(),
    entityId: z.string().optional(),
  })
  const body = await validateBody(event, itemSchema)
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
    entityId: body.entityId || null,
    createdAt: new Date(),
  }).run()

  return { id, name: body.name }
})
