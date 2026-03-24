import { randomUUID } from 'crypto'
import { useDb } from '../../../../utils/db'
import { timelines } from '../../../../db/schema/calendars'
import { hasMinRole } from '../../../../utils/permissions'
import { slugify } from '../../../../services/content'
import type { CampaignRole } from '../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const role = event.context.campaignRole as CampaignRole
  if (!hasMinRole(role, 'editor')) throw createError({ statusCode: 403, message: 'Editors or above can create timelines' })

  const campaignId = getRouterParam(event, 'id')!
  const body = await readBody(event)
  const db = useDb()
  const id = randomUUID()

  db.insert(timelines).values({
    id, campaignId, name: body.name, slug: slugify(body.name),
    description: body.description || null, sortOrder: body.sortOrder || 0,
    createdAt: new Date(),
  }).run()

  return { id, slug: slugify(body.name) }
})
