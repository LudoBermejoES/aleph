import { eq, and } from 'drizzle-orm'
import { useDb } from '../../../../../utils/db'
import { entityTypes } from '../../../../../db/schema/entity-types'
import { entities } from '../../../../../db/schema/entities'
import { hasMinRole } from '../../../../../utils/permissions'
import type { CampaignRole } from '../../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const role = event.context.campaignRole as CampaignRole
  if (!hasMinRole(role, 'co_dm')) throw createError({ statusCode: 403, message: 'Co-DM or above can delete entity types' })

  const campaignId = getRouterParam(event, 'id')!
  const typeId = getRouterParam(event, 'typeId')!
  const db = useDb()

  const entityType = db.select().from(entityTypes)
    .where(and(eq(entityTypes.campaignId, campaignId), eq(entityTypes.id, typeId)))
    .get()
  if (!entityType) throw createError({ statusCode: 404, message: 'Entity type not found' })

  if (entityType.isBuiltin) throw createError({ statusCode: 400, message: 'Cannot delete a builtin entity type' })

  const used = db.select({ id: entities.id }).from(entities)
    .where(and(eq(entities.campaignId, campaignId), eq(entities.type, entityType.slug)))
    .all()
  if (used.length > 0) throw createError({ statusCode: 409, message: `Entity type is in use by ${used.length} entities` })

  db.delete(entityTypes).where(eq(entityTypes.id, typeId)).run()

  return { success: true }
})
