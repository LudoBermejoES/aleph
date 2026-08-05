import { z } from 'zod'
import { randomUUID } from 'crypto'
import { useDb } from '../../../../utils/db'
import { validateBody } from '../../../../utils/validate'
import { arcs } from '../../../../db/schema/sessions'
import { hasMinRole } from '../../../../utils/permissions'
import { slugify } from '../../../../services/content'
import { resolveSubCampaignIdForCreate } from '../../../../utils/sub-campaign'
import type { CampaignRole } from '../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const role = event.context.campaignRole as CampaignRole
  if (!hasMinRole(role, 'co_dm')) {
    throw createError({ statusCode: 403, message: 'Co-DM or above can create arcs' })
  }

  const campaignId = getRouterParam(event, 'id')!
  const arcSchema = z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    sortOrder: z.number().optional(),
    status: z.string().optional(),
    subCampaignSlug: z.string().optional(),
  })
  const body = await validateBody(event, arcSchema)
  const db = useDb()

  const subCampaignId = resolveSubCampaignIdForCreate(db, campaignId, body.subCampaignSlug)

  const id = randomUUID()
  const slug = slugify(body.name)
  db.insert(arcs)
    .values({
      id,
      campaignId,
      subCampaignId,
      name: body.name,
      slug,
      description: body.description || null,
      sortOrder: body.sortOrder || 0,
      status: body.status || 'planned',
    })
    .run()

  // `slug` is what every other arc endpoint is addressed by, so the caller needs it
  // straight away — without it a client can only print `(undefined)` and must re-list.
  return { id, name: body.name, slug }
})
