import { eq, and } from 'drizzle-orm'
import { useDb } from '../../../../utils/db'
import { entities, entityTags } from '../../../../db/schema/entities'
import { hasMinRole } from '../../../../utils/permissions'
import type { CampaignRole } from '../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const role = event.context.campaignRole as CampaignRole
  if (!hasMinRole(role, 'editor')) {
    throw createError({ statusCode: 403, message: 'Editors or above can manage tags' })
  }

  const campaignId = getRouterParam(event, 'id')!
  const slug = getRouterParam(event, 'slug')!
  const body = await readBody(event)
  const { add, remove } = body // add: string[], remove: string[]

  const db = useDb()

  const entity = db.select().from(entities)
    .where(and(eq(entities.campaignId, campaignId), eq(entities.slug, slug)))
    .get()

  if (!entity) {
    throw createError({ statusCode: 404, message: 'Entity not found' })
  }

  // Add tags
  if (add?.length) {
    for (const tagId of add) {
      try {
        db.insert(entityTags).values({ entityId: entity.id, tagId }).run()
      } catch {
        // ignore duplicates
      }
    }
  }

  // Remove tags
  if (remove?.length) {
    for (const tagId of remove) {
      db.delete(entityTags)
        .where(and(eq(entityTags.entityId, entity.id), eq(entityTags.tagId, tagId)))
        .run()
    }
  }

  return { success: true }
})
