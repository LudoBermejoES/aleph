import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { useDb } from '../../../utils/db'
import { campaigns } from '../../../db/schema/campaigns'
import { hasMinRole } from '../../../utils/permissions'
import { validateBody } from '../../../utils/validate'
import type { CampaignRole } from '../../../utils/permissions'

const campaignUpdateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).nullable().optional(),
  isPublic: z.boolean().optional(),
  theme: z.string().nullable().optional(),
})

export default defineEventHandler(async (event) => {
  const role = event.context.campaignRole as CampaignRole
  if (!hasMinRole(role, 'dm')) {
    throw createError({ statusCode: 403, message: 'Only DM can update campaign settings' })
  }

  const body = await validateBody(event, campaignUpdateSchema)
  const campaignId = getRouterParam(event, 'id')!
  const db = useDb()

  db.update(campaigns)
    .set({
      name: body.name,
      description: body.description ?? undefined,
      isPublic: body.isPublic,
      theme: body.theme ?? undefined,
      updatedAt: new Date(),
    })
    .where(eq(campaigns.id, campaignId))
    .run()

  return { success: true }
})
