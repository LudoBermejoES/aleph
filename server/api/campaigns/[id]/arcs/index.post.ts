import { randomUUID } from 'crypto'
import { useDb } from '../../../../utils/db'
import { arcs } from '../../../../db/schema/sessions'
import { hasMinRole } from '../../../../utils/permissions'
import { slugify } from '../../../../services/content'
import type { CampaignRole } from '../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const role = event.context.campaignRole as CampaignRole
  if (!hasMinRole(role, 'co_dm')) {
    throw createError({ statusCode: 403, message: 'Co-DM or above can create arcs' })
  }

  const campaignId = getRouterParam(event, 'id')!
  const body = await readBody(event)
  const db = useDb()

  const id = randomUUID()
  db.insert(arcs).values({
    id,
    campaignId,
    name: body.name,
    slug: slugify(body.name),
    description: body.description || null,
    sortOrder: body.sortOrder || 0,
    status: body.status || 'planned',
  }).run()

  return { id, name: body.name }
})
