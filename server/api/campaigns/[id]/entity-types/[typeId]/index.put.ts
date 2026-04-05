import { eq, and } from 'drizzle-orm'
import { useDb } from '../../../../../utils/db'
import { entityTypes } from '../../../../../db/schema/entity-types'
import { hasMinRole } from '../../../../../utils/permissions'
import type { CampaignRole } from '../../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const role = event.context.campaignRole as CampaignRole
  if (!hasMinRole(role, 'editor'))
    throw createError({ statusCode: 403, message: 'Editors or above can update entity types' })

  const campaignId = getRouterParam(event, 'id')!
  const typeId = getRouterParam(event, 'typeId')!
  const body = await readBody(event)
  const db = useDb()

  const entityType = db
    .select()
    .from(entityTypes)
    .where(and(eq(entityTypes.campaignId, campaignId), eq(entityTypes.id, typeId)))
    .get()
  if (!entityType) throw createError({ statusCode: 404, message: 'Entity type not found' })

  const updates: Partial<typeof entityTypes.$inferInsert> = {}
  if (body.name !== undefined) updates.name = body.name
  if (body.icon !== undefined) updates.icon = body.icon
  if (body.sortOrder !== undefined) updates.sortOrder = body.sortOrder

  db.update(entityTypes).set(updates).where(eq(entityTypes.id, typeId)).run()

  return { success: true }
})
