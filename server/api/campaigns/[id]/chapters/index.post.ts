import { z } from 'zod'
import { randomUUID } from 'crypto'
import { useDb } from '../../../../utils/db'
import { validateBody } from '../../../../utils/validate'
import { chapters } from '../../../../db/schema/sessions'
import { hasMinRole } from '../../../../utils/permissions'
import { slugify } from '../../../../services/content'
import type { CampaignRole } from '../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const role = event.context.campaignRole as CampaignRole
  if (!hasMinRole(role, 'co_dm')) {
    throw createError({ statusCode: 403, message: 'Co-DM or above can create chapters' })
  }

  const chapterSchema = z.object({
    name: z.string().min(1),
    arcId: z.string(),
    description: z.string().optional(),
    sortOrder: z.number().optional(),
  })
  const body = await validateBody(event, chapterSchema)

  const db = useDb()
  const id = randomUUID()
  const slug = slugify(body.name)

  db.insert(chapters)
    .values({
      id,
      arcId: body.arcId,
      name: body.name,
      slug,
      description: body.description || null,
      sortOrder: body.sortOrder || 0,
    })
    .run()

  // Same as arcs: chapter update/delete are slug-addressed, so return the slug.
  return { id, name: body.name, slug, arcId: body.arcId }
})
