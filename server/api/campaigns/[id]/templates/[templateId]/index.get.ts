import { eq } from 'drizzle-orm'
import { useDb } from '../../../../../utils/db'
import { entityTemplates, entityTemplateFields } from '../../../../../db/schema/entities'

export default defineEventHandler(async (event) => {
  const templateId = getRouterParam(event, 'templateId')!
  const db = useDb()

  const template = db.select().from(entityTemplates)
    .where(eq(entityTemplates.id, templateId))
    .get()

  if (!template) {
    throw createError({ statusCode: 404, message: 'Template not found' })
  }

  const fields = db.select().from(entityTemplateFields)
    .where(eq(entityTemplateFields.templateId, templateId))
    .orderBy(entityTemplateFields.sortOrder)
    .all()

  return { ...template, fields }
})
