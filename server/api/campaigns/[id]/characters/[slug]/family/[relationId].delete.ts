import { eq, and, or } from 'drizzle-orm'
import { useDb } from '../../../../../../utils/db'
import { entities } from '../../../../../../db/schema/entities'
import { entityRelations } from '../../../../../../db/schema/relations'
import type { CampaignRole } from '../../../../../../utils/permissions'
import { hasMinRole } from '../../../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const role = event.context.campaignRole as CampaignRole
  if (!hasMinRole(role, 'editor')) {
    throw createError({ statusCode: 403, message: 'Editor or above required' })
  }

  const campaignId = getRouterParam(event, 'id')!
  const slug = getRouterParam(event, 'slug')!
  const relationId = getRouterParam(event, 'relationId')!
  const db = useDb()

  const focusEntity = db
    .select({ id: entities.id })
    .from(entities)
    .where(and(eq(entities.campaignId, campaignId), eq(entities.slug, slug)))
    .get()
  if (!focusEntity) throw createError({ statusCode: 404, message: 'Character not found' })

  const relation = db
    .select()
    .from(entityRelations)
    .where(
      and(
        eq(entityRelations.id, relationId),
        eq(entityRelations.campaignId, campaignId),
        or(
          eq(entityRelations.sourceEntityId, focusEntity.id),
          eq(entityRelations.targetEntityId, focusEntity.id),
        ),
      ),
    )
    .get()
  if (!relation) throw createError({ statusCode: 404, message: 'Family link not found' })

  db.delete(entityRelations).where(eq(entityRelations.id, relationId)).run()

  return { success: true }
})
