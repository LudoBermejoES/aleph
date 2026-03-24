import { eq, and } from 'drizzle-orm'
import { useDb } from '../../../../../utils/db'
import { campaignMembers } from '../../../../../db/schema/campaign-members'
import { hasMinRole, invalidatePermissionCache } from '../../../../../utils/permissions'
import { auditLogFromEvent } from '../../../../../utils/audit'
import type { CampaignRole } from '../../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const role = event.context.campaignRole as CampaignRole
  if (!hasMinRole(role, 'co_dm')) {
    throw createError({ statusCode: 403, message: 'Insufficient permissions to remove members' })
  }

  const campaignId = getRouterParam(event, 'id')!
  const targetUserId = getRouterParam(event, 'userId')!

  // Cannot remove the DM
  const db = useDb()
  const target = db.select()
    .from(campaignMembers)
    .where(and(
      eq(campaignMembers.campaignId, campaignId),
      eq(campaignMembers.userId, targetUserId),
    ))
    .get()

  if (target?.role === 'dm') {
    throw createError({ statusCode: 403, message: 'Cannot remove the campaign DM' })
  }

  db.delete(campaignMembers)
    .where(and(
      eq(campaignMembers.campaignId, campaignId),
      eq(campaignMembers.userId, targetUserId),
    ))
    .run()

  invalidatePermissionCache(targetUserId)

  auditLogFromEvent(event, {
    action: 'campaign_member_remove',
    userId: event.context.user.id,
    target: targetUserId,
    details: { campaignId },
  })

  return { success: true }
})
