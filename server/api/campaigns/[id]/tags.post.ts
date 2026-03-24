import { randomUUID } from 'crypto'
import { useDb } from '../../../utils/db'
import { tags } from '../../../db/schema/entities'
import { hasMinRole } from '../../../utils/permissions'
import { slugify } from '../../../services/content'
import type { CampaignRole } from '../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const role = event.context.campaignRole as CampaignRole
  if (!hasMinRole(role, 'editor')) {
    throw createError({ statusCode: 403, message: 'Editors or above can create tags' })
  }

  const body = await readBody(event)
  const campaignId = getRouterParam(event, 'id')!
  const { name, color } = body

  if (!name?.trim()) {
    throw createError({ statusCode: 400, message: 'Tag name is required' })
  }

  const db = useDb()
  const id = randomUUID()

  db.insert(tags).values({
    id,
    campaignId,
    name: name.trim(),
    slug: slugify(name),
    color: color || null,
  }).run()

  return { id, name: name.trim(), slug: slugify(name), color }
})
