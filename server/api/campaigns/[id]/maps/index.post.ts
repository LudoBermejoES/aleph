import { randomUUID } from 'crypto'
import { useDb } from '../../../../utils/db'
import { maps } from '../../../../db/schema/maps'
import { hasMinRole } from '../../../../utils/permissions'
import { slugify } from '../../../../services/content'
import type { CampaignRole } from '../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const role = event.context.campaignRole as CampaignRole
  if (!hasMinRole(role, 'editor')) {
    throw createError({ statusCode: 403, message: 'Editors or above can create maps' })
  }

  const campaignId = getRouterParam(event, 'id')!
  const body = await readBody(event)
  const db = useDb()
  const now = new Date()
  const id = randomUUID()

  db.insert(maps).values({
    id,
    campaignId,
    name: body.name,
    slug: slugify(body.name),
    parentMapId: body.parentMapId || null,
    visibility: body.visibility || 'members',
    createdAt: now,
    updatedAt: now,
  }).run()

  return { id, slug: slugify(body.name), name: body.name }
})
