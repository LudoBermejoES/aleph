import { z } from 'zod'
import { eq, and } from 'drizzle-orm'
import { useDb } from '../../../../../utils/db'
import { validateBody } from '../../../../../utils/validate'
import { subCampaigns } from '../../../../../db/schema/sessions'
import { hasMinRole } from '../../../../../utils/permissions'
import type { CampaignRole } from '../../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const role = event.context.campaignRole as CampaignRole
  if (!hasMinRole(role, 'editor')) {
    throw createError({ statusCode: 403, message: 'Editors or above can update sub-campaigns' })
  }

  const campaignId = getRouterParam(event, 'id')!
  const slug = getRouterParam(event, 'slug')!
  const subCampaignPutSchema = z.object({
    name: z.string().min(1).optional(),
    description: z.string().optional(),
    sortOrder: z.number().optional(),
  })
  const body = await validateBody(event, subCampaignPutSchema)
  const db = useDb()

  const subCampaign = db
    .select()
    .from(subCampaigns)
    .where(and(eq(subCampaigns.campaignId, campaignId), eq(subCampaigns.slug, slug)))
    .get()
  if (!subCampaign) throw createError({ statusCode: 404, message: 'Sub-campaign not found' })

  const updates: Partial<typeof subCampaign> = { updatedAt: new Date() }
  if (body.name !== undefined) updates.name = body.name.trim()
  if (body.description !== undefined) updates.description = body.description
  if (body.sortOrder !== undefined) updates.sortOrder = body.sortOrder

  db.update(subCampaigns).set(updates).where(eq(subCampaigns.id, subCampaign.id)).run()

  return db.select().from(subCampaigns).where(eq(subCampaigns.id, subCampaign.id)).get()
})
