import { z } from 'zod'
import { randomUUID } from 'crypto'
import { useDb } from '../../../../utils/db'
import { validateBody } from '../../../../utils/validate'
import { relationTypes } from '../../../../db/schema/relations'
import { hasMinRole } from '../../../../utils/permissions'
import { slugify } from '../../../../services/content'
import type { CampaignRole } from '../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const role = event.context.campaignRole as CampaignRole
  if (!hasMinRole(role, 'dm'))
    throw createError({ statusCode: 403, message: 'Only DM can create relation types' })

  const campaignId = getRouterParam(event, 'id')!
  const relationTypeSchema = z.object({
    forwardLabel: z.string().min(1),
    reverseLabel: z.string().min(1),
  })
  const body = await validateBody(event, relationTypeSchema)
  const db = useDb()

  const id = randomUUID()
  db.insert(relationTypes)
    .values({
      id,
      campaignId,
      slug: slugify(body.forwardLabel || 'custom'),
      forwardLabel: body.forwardLabel,
      reverseLabel: body.reverseLabel,
      isBuiltin: false,
    })
    .run()

  return { id }
})
