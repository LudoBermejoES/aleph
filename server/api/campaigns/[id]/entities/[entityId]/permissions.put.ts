import { randomUUID } from 'crypto'
import { eq } from 'drizzle-orm'
import { useDb } from '../../../../../utils/db'
import { entityPermissions } from '../../../../../db/schema/permissions'
import { hasMinRole, invalidatePermissionCache } from '../../../../../utils/permissions'
import { auditLogFromEvent } from '../../../../../utils/audit'
import type { CampaignRole } from '../../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const role = event.context.campaignRole as CampaignRole
  if (!hasMinRole(role, 'dm')) {
    throw createError({ statusCode: 403, message: 'Only DM can set entity permission overrides' })
  }

  const body = await readBody(event)
  const entityId = getRouterParam(event, 'entityId')!
  const { targetUserId, targetRole, permission, effect } = body

  if (!permission || !effect) {
    throw createError({ statusCode: 400, message: 'Permission and effect are required' })
  }

  if (!targetUserId && !targetRole) {
    throw createError({ statusCode: 400, message: 'Either targetUserId or targetRole is required' })
  }

  const db = useDb()

  db.insert(entityPermissions).values({
    id: randomUUID(),
    entityId,
    targetUserId: targetUserId || null,
    targetRole: targetRole || null,
    permission,
    effect,
    grantedBy: event.context.user.id,
    createdAt: new Date(),
  }).run()

  // Invalidate cache for affected user
  if (targetUserId) {
    invalidatePermissionCache(targetUserId)
  } else {
    invalidatePermissionCache(undefined, entityId)
  }

  auditLogFromEvent(event, {
    action: 'permission_grant',
    userId: event.context.user.id,
    target: entityId,
    details: { targetUserId, targetRole, permission, effect },
  })

  return { success: true }
})
