import { randomUUID } from 'crypto'
import { useDb } from '../../../utils/db'
import { entityTypes } from '../../../db/schema/entity-types'
import { hasMinRole } from '../../../utils/permissions'
import { slugify } from '../../../services/content'
import type { CampaignRole } from '../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const role = event.context.campaignRole as CampaignRole
  if (!hasMinRole(role, 'dm')) {
    throw createError({ statusCode: 403, message: 'Only DM can create custom entity types' })
  }

  const body = await readBody(event)
  const campaignId = getRouterParam(event, 'id')!
  const { name, icon } = body

  if (!name?.trim()) {
    throw createError({ statusCode: 400, message: 'Name is required' })
  }

  const db = useDb()
  const id = randomUUID()

  db.insert(entityTypes).values({
    id,
    campaignId,
    slug: slugify(name),
    name: name.trim(),
    icon: icon || null,
    isBuiltin: false,
    sortOrder: 100,
  }).run()

  return { id, slug: slugify(name), name: name.trim() }
})
