import { eq } from 'drizzle-orm'
import { useDb } from '../../../../utils/db'
import { relationTypes } from '../../../../db/schema/relations'
import { hasMinRole } from '../../../../utils/permissions'
import type { CampaignRole } from '../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const role = event.context.campaignRole as CampaignRole
  if (!hasMinRole(role, 'dm')) throw createError({ statusCode: 403, message: 'Only DM can edit relation types' })

  const typeId = getRouterParam(event, 'typeId')!
  const body = await readBody(event)
  const db = useDb()

  const type = db.select().from(relationTypes).where(eq(relationTypes.id, typeId)).get()
  if (!type) throw createError({ statusCode: 404, message: 'Relation type not found' })
  if (type.isBuiltin) throw createError({ statusCode: 403, message: 'Cannot modify built-in relation types' })

  const updates: Record<string, unknown> = {}
  if (body.forwardLabel !== undefined) updates.forwardLabel = body.forwardLabel
  if (body.reverseLabel !== undefined) updates.reverseLabel = body.reverseLabel

  db.update(relationTypes).set(updates).where(eq(relationTypes.id, typeId)).run()
  return { success: true }
})
