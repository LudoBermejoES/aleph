import { eq, and } from 'drizzle-orm'
import { useDb, useSqlite } from '../../../../../utils/db'
import { entities } from '../../../../../db/schema/entities'
import { hasMinRole } from '../../../../../utils/permissions'
import { deleteEntityFile } from '../../../../../services/content'
import { removeEntityFromIndex } from '../../../../../services/search'
import { logger } from '../../../../../utils/logger'
import type { CampaignRole } from '../../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const role = event.context.campaignRole as CampaignRole
  if (!hasMinRole(role, 'co_dm')) {
    throw createError({ statusCode: 403, message: 'Co-DM or above can delete entities' })
  }

  const campaignId = getRouterParam(event, 'id')!
  const slug = getRouterParam(event, 'slug')!
  const db = useDb()
  const sqlite = useSqlite()

  const entity = db.select().from(entities)
    .where(and(eq(entities.campaignId, campaignId), eq(entities.slug, slug)))
    .get()

  if (!entity) {
    throw createError({ statusCode: 404, message: 'Entity not found' })
  }

  // Delete .md file
  await deleteEntityFile(entity.filePath)

  // Remove from FTS5
  removeEntityFromIndex(sqlite, entity.id)

  // Delete DB row (cascades to entity_tags, entity_permissions)
  db.delete(entities).where(eq(entities.id, entity.id)).run()

  logger.debug('Entity deleted', { entityId: entity.id, slug, campaignId })

  return { success: true }
})
