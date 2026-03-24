import { eq } from 'drizzle-orm'
import { useDb } from '../../../../../utils/db'
import { entityRelations } from '../../../../../db/schema/relations'
import { hasMinRole } from '../../../../../utils/permissions'
import type { CampaignRole } from '../../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const role = event.context.campaignRole as CampaignRole
  if (!hasMinRole(role, 'editor')) throw createError({ statusCode: 403, message: 'Editors or above can edit relations' })

  const relationId = getRouterParam(event, 'relationId')!
  const body = await readBody(event)
  const db = useDb()

  const updates: Record<string, unknown> = { updatedAt: new Date() }
  if (body.attitude !== undefined) updates.attitude = body.attitude
  if (body.description !== undefined) updates.description = body.description
  if (body.forwardLabel !== undefined) updates.forwardLabel = body.forwardLabel
  if (body.reverseLabel !== undefined) updates.reverseLabel = body.reverseLabel
  if (body.visibility !== undefined) updates.visibility = body.visibility
  if (body.isPinned !== undefined) updates.isPinned = body.isPinned
  if (body.metadata !== undefined) updates.metadataJson = JSON.stringify(body.metadata)

  db.update(entityRelations).set(updates).where(eq(entityRelations.id, relationId)).run()
  return { success: true }
})
