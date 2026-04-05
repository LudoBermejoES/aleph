import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { randomUUID } from 'crypto'
import { useDb } from '../../../../../utils/db'
import { validateBody } from '../../../../../utils/validate'
import { entityTemplates, entityTemplateFields } from '../../../../../db/schema/entities'
import { hasMinRole } from '../../../../../utils/permissions'
import type { CampaignRole } from '../../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const role = event.context.campaignRole as CampaignRole
  if (!hasMinRole(role, 'dm')) {
    throw createError({ statusCode: 403, message: 'Only DM can edit templates' })
  }

  const templateId = getRouterParam(event, 'templateId')!
  const templatePutSchema = z.object({
    name: z.string().min(1).optional(),
    isDefault: z.boolean().optional(),
    fields: z.array(z.object({
      key: z.string(),
      label: z.string(),
      fieldType: z.string().optional(),
      options: z.unknown().optional(),
      required: z.boolean().optional(),
    })).optional(),
  })
  const body = await validateBody(event, templatePutSchema)
  const db = useDb()

  // Update template name/default
  if (body.name || body.isDefault !== undefined) {
    const updates: Record<string, unknown> = {}
    if (body.name) updates.name = body.name
    if (body.isDefault !== undefined) updates.isDefault = body.isDefault
    db.update(entityTemplates).set(updates).where(eq(entityTemplates.id, templateId)).run()
  }

  // Replace fields if provided
  if (body.fields) {
    db.delete(entityTemplateFields).where(eq(entityTemplateFields.templateId, templateId)).run()
    for (let i = 0; i < body.fields.length; i++) {
      const f = body.fields[i]
      db.insert(entityTemplateFields).values({
        id: randomUUID(),
        templateId,
        key: f.key,
        label: f.label,
        fieldType: f.fieldType || 'text',
        optionsJson: f.options ? JSON.stringify(f.options) : null,
        sortOrder: i,
        required: f.required || false,
      }).run()
    }
  }

  return { success: true }
})
