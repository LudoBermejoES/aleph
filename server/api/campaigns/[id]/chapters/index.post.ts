import { randomUUID } from 'crypto'
import { useDb } from '../../../../utils/db'
import { chapters } from '../../../../db/schema/sessions'
import { hasMinRole } from '../../../../utils/permissions'
import { slugify } from '../../../../services/content'
import type { CampaignRole } from '../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const role = event.context.campaignRole as CampaignRole
  if (!hasMinRole(role, 'co_dm')) {
    throw createError({ statusCode: 403, message: 'Co-DM or above can create chapters' })
  }

  const body = await readBody(event)
  if (!body.name || !body.arcId) {
    throw createError({ statusCode: 400, message: 'name and arcId required' })
  }

  const db = useDb()
  const id = randomUUID()

  db.insert(chapters).values({
    id,
    arcId: body.arcId,
    name: body.name,
    slug: slugify(body.name),
    description: body.description || null,
    sortOrder: body.sortOrder || 0,
  }).run()

  return { id, name: body.name }
})
