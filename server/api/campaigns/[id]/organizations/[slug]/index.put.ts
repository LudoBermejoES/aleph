import { z } from 'zod'
import { eq, and } from 'drizzle-orm'
import { useDb } from '../../../../../utils/db'
import { validateBody } from '../../../../../utils/validate'
import { organizations } from '../../../../../db/schema'
import { hasMinRole } from '../../../../../utils/permissions'
import { updateOrganizationWithEntity } from '../../../../../services/organizations'
import type { CampaignRole } from '../../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const role = event.context.campaignRole as CampaignRole
  if (!hasMinRole(role, 'editor')) {
    throw createError({ statusCode: 403, message: 'Editors or above can update organizations' })
  }

  const campaignId = getRouterParam(event, 'id')!
  const slug = getRouterParam(event, 'slug')!
  const db = useDb()

  const org = db
    .select()
    .from(organizations)
    .where(and(eq(organizations.campaignId, campaignId), eq(organizations.slug, slug)))
    .get()

  if (!org) {
    throw createError({ statusCode: 404, message: 'Organization not found' })
  }

  const orgPutSchema = z.object({
    name: z.string().min(1).optional(),
    description: z.string().optional(),
    type: z.string().optional(),
    status: z.string().optional(),
    imageUrl: z.string().nullable().optional(),
    templateId: z.string().nullable().optional(),
    fields: z.record(z.string(), z.unknown()).optional(),
  })
  const body = await validateBody(event, orgPutSchema)
  const { name, description, type, status, imageUrl, templateId, fields } = body

  try {
    const updated = updateOrganizationWithEntity(db, campaignId, org.id, {
      name,
      description,
      type,
      status,
      imageUrl,
      templateId,
      fieldsJson: fields !== undefined ? JSON.stringify(fields) : undefined,
    })
    const parsedFields = updated.fieldsJson
      ? (JSON.parse(updated.fieldsJson) as Record<string, unknown>)
      : {}
    return { ...updated, fields: parsedFields }
  } catch (err: unknown) {
    const e = err as { statusCode?: number; message?: string }
    if (e.statusCode) throw createError({ statusCode: e.statusCode, message: e.message })
    throw err
  }
})
