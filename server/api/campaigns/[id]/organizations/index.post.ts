import { z } from 'zod'
import { useDb } from '../../../../utils/db'
import { validateBody } from '../../../../utils/validate'
import { hasMinRole } from '../../../../utils/permissions'
import { createOrganizationWithEntity } from '../../../../services/organizations'
import type { CampaignRole } from '../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const role = event.context.campaignRole as CampaignRole
  if (!hasMinRole(role, 'editor')) {
    throw createError({ statusCode: 403, message: 'Editors or above can create organizations' })
  }

  const orgSchema = z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    type: z.string().optional(),
    status: z.string().optional(),
    templateId: z.string().optional(),
    fields: z.record(z.string(), z.unknown()).optional(),
  })
  const body = await validateBody(event, orgSchema)
  const { name, description, type, status, templateId, fields } = body

  const db = useDb()
  const campaignId = getRouterParam(event, 'id')!
  const createdBy = event.context.user!.id

  try {
    const org = createOrganizationWithEntity(db, {
      campaignId,
      name,
      description,
      type,
      status,
      templateId,
      fieldsJson: fields ? JSON.stringify(fields) : null,
      createdBy,
    })
    const parsedFields = org.fieldsJson
      ? (JSON.parse(org.fieldsJson) as Record<string, unknown>)
      : {}
    return { ...org, fields: parsedFields }
  } catch (err: unknown) {
    const e = err as { statusCode?: number; message?: string }
    if (e.statusCode) throw createError({ statusCode: e.statusCode, message: e.message })
    throw err
  }
})
