import { z } from 'zod'
import { randomUUID } from 'crypto'
import { useDb } from '../../../../utils/db'
import { validateBody } from '../../../../utils/validate'
import { diagrams } from '../../../../db/schema/diagrams'
import { hasMinRole } from '../../../../utils/permissions'
import type { CampaignRole } from '../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const role = event.context.campaignRole as CampaignRole
  if (!hasMinRole(role, 'editor')) {
    throw createError({ statusCode: 403, message: 'Editors or above can create diagrams' })
  }

  const campaignId = getRouterParam(event, 'id')!
  const userId = event.context.user?.id as string

  const schema = z.object({
    title: z.string().min(1),
    diagramType: z.string().optional(),
  })
  const body = await validateBody(event, schema)
  const db = useDb()
  const now = new Date()
  const id = randomUUID()

  db.insert(diagrams)
    .values({
      id,
      campaignId,
      title: body.title,
      diagramType: body.diagramType || 'freeform',
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    })
    .run()

  return { id, title: body.title, diagramType: body.diagramType || 'freeform' }
})
