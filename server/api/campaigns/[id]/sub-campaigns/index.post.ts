import { z } from 'zod'
import { randomUUID } from 'crypto'
import { eq, and } from 'drizzle-orm'
import { useDb } from '../../../../utils/db'
import { validateBody } from '../../../../utils/validate'
import { subCampaigns } from '../../../../db/schema/sessions'
import { hasMinRole } from '../../../../utils/permissions'
import { slugify } from '../../../../services/content'
import type { CampaignRole } from '../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const role = event.context.campaignRole as CampaignRole
  if (!hasMinRole(role, 'editor')) {
    throw createError({ statusCode: 403, message: 'Editors or above can create sub-campaigns' })
  }

  const campaignId = getRouterParam(event, 'id')!
  const subCampaignSchema = z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    sortOrder: z.number().optional(),
  })
  const body = await validateBody(event, subCampaignSchema)

  const db = useDb()
  const slug = slugify(body.name)

  const existing = db
    .select({ id: subCampaigns.id })
    .from(subCampaigns)
    .where(and(eq(subCampaigns.campaignId, campaignId), eq(subCampaigns.slug, slug)))
    .get()
  if (existing) {
    throw createError({
      statusCode: 409,
      message: `A sub-campaign with slug "${slug}" already exists`,
    })
  }

  const id = randomUUID()
  const now = new Date()

  db.insert(subCampaigns)
    .values({
      id,
      campaignId,
      name: body.name.trim(),
      slug,
      description: body.description ?? null,
      sortOrder: body.sortOrder ?? 0,
      isDefault: false,
      createdAt: now,
      updatedAt: now,
    })
    .run()

  return db.select().from(subCampaigns).where(eq(subCampaigns.id, id)).get()
})
