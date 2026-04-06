import { z } from 'zod'
import { eq, and } from 'drizzle-orm'
import { useDb } from '../../../../utils/db'
import { validateBody } from '../../../../utils/validate'
import { diagrams } from '../../../../db/schema/diagrams'
import { hasMinRole } from '../../../../utils/permissions'
import type { CampaignRole } from '../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const role = event.context.campaignRole as CampaignRole
  if (!hasMinRole(role, 'editor')) {
    throw createError({ statusCode: 403, message: 'Editors or above can update diagrams' })
  }

  const campaignId = getRouterParam(event, 'id')!
  const diagramId = getRouterParam(event, 'diagramId')!

  const schema = z.object({
    title: z.string().min(1).optional(),
    description: z.string().optional(),
    diagramType: z.string().optional(),
  })
  const body = await validateBody(event, schema)
  const db = useDb()

  const existing = db
    .select()
    .from(diagrams)
    .where(and(eq(diagrams.id, diagramId), eq(diagrams.campaignId, campaignId)))
    .get()

  if (!existing) {
    throw createError({ statusCode: 404, message: 'Diagram not found' })
  }

  const now = new Date()
  db.update(diagrams)
    .set({
      ...(body.title !== undefined && { title: body.title }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.diagramType !== undefined && { diagramType: body.diagramType }),
      updatedAt: now,
    })
    .where(eq(diagrams.id, diagramId))
    .run()

  return { id: diagramId, ...body, updatedAt: now }
})
