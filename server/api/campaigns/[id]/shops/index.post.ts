import { randomUUID } from 'crypto'
import { useDb } from '../../../../utils/db'
import { shops } from '../../../../db/schema/inventory'
import { hasMinRole } from '../../../../utils/permissions'
import { slugify } from '../../../../services/content'
import type { CampaignRole } from '../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const role = event.context.campaignRole as CampaignRole
  if (!hasMinRole(role, 'editor')) throw createError({ statusCode: 403, message: 'Editors or above can create shops' })

  const campaignId = getRouterParam(event, 'id')!
  const body = await readBody(event)
  const db = useDb()
  const id = randomUUID()

  db.insert(shops).values({
    id,
    campaignId,
    name: body.name,
    slug: slugify(body.name),
    description: body.description || null,
    locationEntityId: body.locationEntityId || null,
    shopkeeperEntityId: body.shopkeeperEntityId || null,
    isPlayerOwned: body.isPlayerOwned || false,
    ownedByUserId: body.ownedByUserId || null,
    createdAt: new Date(),
  }).run()

  return { id, slug: slugify(body.name), name: body.name }
})
