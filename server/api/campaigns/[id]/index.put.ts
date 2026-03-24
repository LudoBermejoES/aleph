import { eq } from 'drizzle-orm'
import { useDb } from '../../../utils/db'
import { campaigns } from '../../../db/schema/campaigns'
import { hasMinRole } from '../../../utils/permissions'
import type { CampaignRole } from '../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const role = event.context.campaignRole as CampaignRole
  if (!hasMinRole(role, 'dm')) {
    throw createError({ statusCode: 403, message: 'Only DM can update campaign settings' })
  }

  const body = await readBody(event)
  const campaignId = getRouterParam(event, 'id')!
  const db = useDb()

  db.update(campaigns)
    .set({
      name: body.name,
      description: body.description,
      isPublic: body.isPublic,
      theme: body.theme,
      updatedAt: new Date(),
    })
    .where(eq(campaigns.id, campaignId))
    .run()

  return { success: true }
})
