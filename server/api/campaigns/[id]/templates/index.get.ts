import { eq, sql } from 'drizzle-orm'
import { useDb } from '../../../../utils/db'
import { entityTemplates, entityTemplateFields } from '../../../../db/schema/entities'

export default defineEventHandler(async (event) => {
  const campaignId = getRouterParam(event, 'id')!
  const db = useDb()

  return db
    .select({
      id: entityTemplates.id,
      campaignId: entityTemplates.campaignId,
      entityTypeSlug: entityTemplates.entityTypeSlug,
      name: entityTemplates.name,
      isDefault: entityTemplates.isDefault,
      createdAt: entityTemplates.createdAt,
      fieldCount: sql<number>`(select count(*) from ${entityTemplateFields} where ${entityTemplateFields.templateId} = ${entityTemplates.id})`,
    })
    .from(entityTemplates)
    .where(eq(entityTemplates.campaignId, campaignId))
    .all()
})
