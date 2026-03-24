import { randomUUID } from 'crypto'
import { eq, and } from 'drizzle-orm'
import { useDb } from '../../../../../utils/db'
import { campaignMembers, campaignMemberPermissions } from '../../../../../db/schema/campaign-members'
import { hasMinRole } from '../../../../../utils/permissions'
import { auditLogFromEvent } from '../../../../../utils/audit'
import type { CampaignRole } from '../../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const role = event.context.campaignRole as CampaignRole
  if (!hasMinRole(role, 'dm')) {
    throw createError({ statusCode: 403, message: 'Only DM can grant named permissions' })
  }

  const body = await readBody(event)
  const campaignId = getRouterParam(event, 'id')!
  const targetUserId = getRouterParam(event, 'userId')!
  const { permission } = body

  if (!permission) {
    throw createError({ statusCode: 400, message: 'Permission is required' })
  }

  const db = useDb()

  // Find campaign member
  const member = db.select()
    .from(campaignMembers)
    .where(and(
      eq(campaignMembers.campaignId, campaignId),
      eq(campaignMembers.userId, targetUserId),
    ))
    .get()

  if (!member) {
    throw createError({ statusCode: 404, message: 'User is not a campaign member' })
  }

  db.insert(campaignMemberPermissions).values({
    id: randomUUID(),
    campaignMemberId: member.id,
    permission,
    grantedBy: event.context.user.id,
    grantedAt: new Date(),
  }).run()

  auditLogFromEvent(event, {
    action: 'permission_grant',
    userId: event.context.user.id,
    target: targetUserId,
    details: { campaignId, permission },
  })

  return { success: true }
})
