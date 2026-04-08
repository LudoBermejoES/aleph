import { z } from 'zod'
import { randomUUID } from 'crypto'
import { useDb } from '../../../../utils/db'
import { validateBody } from '../../../../utils/validate'
import { diagrams, diagramSnapshots } from '../../../../db/schema/diagrams'
import { hasMinRole } from '../../../../utils/permissions'
import { generateDiagram, toTldrawSnapshot } from '../../../../utils/diagram-generator'
import type { CampaignRole } from '../../../../utils/permissions'
import type { DiagramType } from '../../../../utils/diagram-generator'

export default defineEventHandler(async (event) => {
  const role = event.context.campaignRole as CampaignRole
  if (!hasMinRole(role, 'editor')) {
    throw createError({ statusCode: 403, message: 'Editors or above can generate diagrams' })
  }

  const campaignId = getRouterParam(event, 'id')!
  const userId = event.context.user?.id as string

  const schema = z.object({
    type: z.enum(['entity-graph', 'quest-tree', 'faction-web', 'session-timeline']),
    title: z.string().min(1).optional(),
  })
  const body = await validateBody(event, schema)
  const db = useDb()

  let generated: ReturnType<typeof generateDiagram>
  try {
    generated = generateDiagram(db, campaignId, body.type as DiagramType)
  } catch (e: unknown) {
    throw createError({ statusCode: 422, message: (e as Error).message ?? 'Generation failed' })
  }

  const snapshot = toTldrawSnapshot(generated)
  const snapshotStr = JSON.stringify(snapshot)

  const now = new Date()
  const diagramId = randomUUID()
  const title = body.title ?? `${body.type} diagram`

  db.insert(diagrams)
    .values({
      id: diagramId,
      campaignId,
      title,
      diagramType: body.type,
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    })
    .run()

  db.insert(diagramSnapshots)
    .values({
      id: randomUUID(),
      diagramId,
      snapshot: snapshotStr,
      version: 1,
      createdAt: now,
    })
    .run()

  return { id: diagramId, title, diagramType: body.type, shapeCount: generated.shapes.length }
})
