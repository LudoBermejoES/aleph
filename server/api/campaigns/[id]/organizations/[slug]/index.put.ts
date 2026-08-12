import { z } from 'zod'
import { eq, and } from 'drizzle-orm'
import { useDb, useSqlite } from '../../../../../utils/db'
import { validateBody } from '../../../../../utils/validate'
import { organizations } from '../../../../../db/schema'
import { hasMinRole } from '../../../../../utils/permissions'
import { updateOrganizationWithEntity } from '../../../../../services/organizations'
import { indexEntity } from '../../../../../services/search'
import { indexEntityEmbedding } from '../../../../../services/embeddings'
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
    visibility: z
      .enum(['public', 'members', 'editors', 'dm_only', 'private', 'specific_users'])
      .optional(),
    imageUrl: z.string().nullable().optional(),
    templateId: z.string().nullable().optional(),
    fields: z.record(z.string(), z.unknown()).optional(),
  })
  const body = await validateBody(event, orgPutSchema)
  const { name, description, type, status, visibility, imageUrl, templateId, fields } = body

  try {
    const updated = updateOrganizationWithEntity(db, campaignId, org.id, {
      name,
      description,
      type,
      status,
      visibility,
      imageUrl,
      templateId,
      fieldsJson: fields !== undefined ? JSON.stringify(fields) : undefined,
    })

    const sqlite = useSqlite()
    indexEntity(sqlite, updated.id, campaignId, updated.name, [], [], updated.description || '')
    await indexEntityEmbedding(
      sqlite,
      updated.id,
      campaignId,
      updated.name,
      updated.description || '',
    )

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
