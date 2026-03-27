import { eq, and } from 'drizzle-orm'
import { useDb } from '../../../../utils/db'
import { entities } from '../../../../db/schema/entities'
import { hasMinRole } from '../../../../utils/permissions'
import { unlink } from 'fs/promises'
import type { CampaignRole } from '../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const role = event.context.campaignRole as CampaignRole
  if (!hasMinRole(role, 'co_dm')) {
    throw createError({ statusCode: 403, message: 'Only co-DM or DM can delete locations' })
  }

  const campaignId = getRouterParam(event, 'id')!
  const slug = getRouterParam(event, 'slug')!
  const db = useDb()

  const entity = db.select().from(entities)
    .where(and(eq(entities.campaignId, campaignId), eq(entities.slug, slug), eq(entities.type, 'location')))
    .get()
  if (!entity) throw createError({ statusCode: 404, message: 'Location not found' })

  // Delete markdown file
  try {
    await unlink(entity.filePath)
  } catch { /* file may already be gone */ }

  // Delete DB row (cascades to entity_relations, permissions, etc.)
  db.delete(entities).where(eq(entities.id, entity.id)).run()

  return null
})
