import { eq } from 'drizzle-orm'
import { useDb } from '../../../utils/db'
import { campaigns } from '../../../db/schema/campaigns'
import { hasMinRole } from '../../../utils/permissions'
import { logger } from '../../../utils/logger'
import { auditLogFromEvent } from '../../../utils/audit'
import type { CampaignRole } from '../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const role = event.context.campaignRole as CampaignRole
  if (!hasMinRole(role, 'dm')) {
    throw createError({ statusCode: 403, message: 'Only DM can delete campaign' })
  }

  const campaignId = getRouterParam(event, 'id')!
  const db = useDb()

  db.delete(campaigns).where(eq(campaigns.id, campaignId)).run()

  logger.info('Campaign deleted', { campaignId, userId: event.context.user.id })
  auditLogFromEvent(event, {
    action: 'campaign_delete',
    userId: event.context.user.id,
    target: campaignId,
  })

  return { success: true }
})
