import { eq, and } from 'drizzle-orm'
import { useDb, useSqlite } from '../../../../../utils/db'
import { entities } from '../../../../../db/schema/entities'
import { hasMinRole } from '../../../../../utils/permissions'
import { deleteEntityFile } from '../../../../../services/content'
import { removeEntityFromIndex } from '../../../../../services/search'
import type { CampaignRole } from '../../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const role = event.context.campaignRole as CampaignRole
  if (!hasMinRole(role, 'co_dm')) {
    throw createError({ statusCode: 403, message: 'Co-DM or above can delete characters' })
  }

  const campaignId = getRouterParam(event, 'id')!
  const slug = getRouterParam(event, 'slug')!
  const db = useDb()
  const sqlite = useSqlite()

  const entity = db.select().from(entities)
    .where(and(eq(entities.campaignId, campaignId), eq(entities.slug, slug)))
    .get()
  if (!entity) throw createError({ statusCode: 404, message: 'Character not found' })

  await deleteEntityFile(entity.filePath)
  removeEntityFromIndex(sqlite, entity.id)
  // Cascade handles characters, stats, abilities, connections
  db.delete(entities).where(eq(entities.id, entity.id)).run()

  return { success: true }
})
