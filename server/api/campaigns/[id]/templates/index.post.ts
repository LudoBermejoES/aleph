import { z } from 'zod'
import { randomUUID } from 'crypto'
import { useDb } from '../../../../utils/db'
import { validateBody } from '../../../../utils/validate'
import { entityTemplates, entityTemplateFields } from '../../../../db/schema/entities'
import { hasMinRole } from '../../../../utils/permissions'
import type { CampaignRole } from '../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const role = event.context.campaignRole as CampaignRole
  if (!hasMinRole(role, 'dm')) {
    throw createError({ statusCode: 403, message: 'Only DM can create templates' })
  }

  const campaignId = getRouterParam(event, 'id')!
  const templateSchema = z.object({
    name: z.string().min(1),
    entityTypeSlug: z.string().min(1),
    isDefault: z.boolean().optional(),
    fields: z
      .array(
        z.object({
          key: z.string(),
          label: z.string(),
          fieldType: z.string().optional(),
          options: z.unknown().optional(),
          required: z.boolean().optional(),
        }),
      )
      .optional(),
  })
  const body = await validateBody(event, templateSchema)
  const { name, entityTypeSlug, isDefault, fields } = body

  const db = useDb()
  const templateId = randomUUID()

  db.insert(entityTemplates)
    .values({
      id: templateId,
      campaignId,
      entityTypeSlug,
      name: name.trim(),
      isDefault: isDefault || false,
      createdAt: new Date(),
    })
    .run()

  // Create fields if provided
  if (fields?.length) {
    for (let i = 0; i < fields.length; i++) {
      const f = fields[i]
      db.insert(entityTemplateFields)
        .values({
          id: randomUUID(),
          templateId,
          key: f.key,
          label: f.label,
          fieldType: f.fieldType || 'text',
          optionsJson: f.options ? JSON.stringify(f.options) : null,
          sortOrder: i,
          required: f.required || false,
        })
        .run()
    }
  }

  return { id: templateId, name: name.trim(), entityTypeSlug }
})
