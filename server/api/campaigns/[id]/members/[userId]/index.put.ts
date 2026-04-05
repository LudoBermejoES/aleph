import { z } from 'zod'
import { eq, and } from 'drizzle-orm'
import { useDb } from '../../../../../utils/db'
import { validateBody } from '../../../../../utils/validate'
import { campaignMembers } from '../../../../../db/schema/campaign-members'
import { hasMinRole } from '../../../../../utils/permissions'
import { auditLogFromEvent } from '../../../../../utils/audit'
import { invalidatePermissionCache } from '../../../../../utils/permissions'
import type { CampaignRole } from '../../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const role = event.context.campaignRole as CampaignRole
  if (!hasMinRole(role, 'co_dm')) {
    throw createError({ statusCode: 403, message: 'Insufficient permissions to change roles' })
  }

  const memberPutSchema = z.object({
    role: z.enum(['dm', 'co_dm', 'editor', 'player', 'viewer']),
  })
  const body = await validateBody(event, memberPutSchema)
  const campaignId = getRouterParam(event, 'id')!
  const targetUserId = getRouterParam(event, 'userId')!
  const newRole = body.role as CampaignRole

  // Co-DMs can only assign up to editor
  if (role === 'co_dm' && !hasMinRole('editor' as CampaignRole, newRole)) {
    throw createError({ statusCode: 403, message: 'Co-DM can only assign up to Editor role' })
  }

  const db = useDb()

  db.update(campaignMembers)
    .set({ role: newRole })
    .where(
      and(eq(campaignMembers.campaignId, campaignId), eq(campaignMembers.userId, targetUserId)),
    )
    .run()

  invalidatePermissionCache(targetUserId)

  auditLogFromEvent(event, {
    action: 'role_change',
    userId: event.context.user.id,
    target: targetUserId,
    details: { campaignId, newRole },
  })

  return { success: true }
})
