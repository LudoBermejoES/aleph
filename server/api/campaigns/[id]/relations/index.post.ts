import { randomUUID } from 'crypto'
import { eq } from 'drizzle-orm'
import { useDb } from '../../../../utils/db'
import { entityRelations } from '../../../../db/schema/relations'
import { entities } from '../../../../db/schema/entities'
import { hasMinRole } from '../../../../utils/permissions'
import type { CampaignRole } from '../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const role = event.context.campaignRole as CampaignRole
  if (!hasMinRole(role, 'editor')) throw createError({ statusCode: 403, message: 'Editors or above can create relations' })

  const campaignId = getRouterParam(event, 'id')!
  const body = await readBody(event)
  const db = useDb()
  const now = new Date()

  // Validate entities exist
  const source = db.select().from(entities).where(eq(entities.id, body.sourceEntityId)).get()
  if (!source) throw createError({ statusCode: 404, message: 'Source entity not found' })
  const target = db.select().from(entities).where(eq(entities.id, body.targetEntityId)).get()
  if (!target) throw createError({ statusCode: 404, message: 'Target entity not found' })

  if (source.campaignId !== campaignId || target.campaignId !== campaignId) {
    throw createError({ statusCode: 400, message: 'Both entities must be in the same campaign' })
  }

  const id = randomUUID()
  db.insert(entityRelations).values({
    id,
    campaignId,
    sourceEntityId: body.sourceEntityId,
    targetEntityId: body.targetEntityId,
    relationTypeId: body.relationTypeId,
    forwardLabel: body.forwardLabel || 'related to',
    reverseLabel: body.reverseLabel || 'related to',
    attitude: body.attitude ?? 0,
    description: body.description || null,
    metadataJson: body.metadata ? JSON.stringify(body.metadata) : null,
    visibility: body.visibility || 'public',
    isPinned: body.isPinned || false,
    createdBy: event.context.user.id,
    createdAt: now,
    updatedAt: now,
  }).run()

  return { id }
})
