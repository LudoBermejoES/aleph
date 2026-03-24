import { randomUUID } from 'crypto'
import { eq, and, isNull } from 'drizzle-orm'
import { useDb } from '../../../utils/db'
import { campaignInvitations, campaignMembers } from '../../../db/schema/campaign-members'
import { auditLogFromEvent } from '../../../utils/audit'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { token } = body

  if (!token) {
    throw createError({ statusCode: 400, message: 'Invitation token is required' })
  }

  const campaignId = getRouterParam(event, 'id')!
  const db = useDb()

  // Find valid invitation
  const invitation = db.select()
    .from(campaignInvitations)
    .where(and(
      eq(campaignInvitations.campaignId, campaignId),
      eq(campaignInvitations.token, token),
      isNull(campaignInvitations.usedAt),
    ))
    .get()

  if (!invitation) {
    throw createError({ statusCode: 404, message: 'Invalid or expired invitation' })
  }

  if (new Date() > invitation.expiresAt) {
    throw createError({ statusCode: 410, message: 'Invitation has expired' })
  }

  // Check if already a member
  const existing = db.select()
    .from(campaignMembers)
    .where(and(
      eq(campaignMembers.campaignId, campaignId),
      eq(campaignMembers.userId, event.context.user.id),
    ))
    .get()

  if (existing) {
    throw createError({ statusCode: 409, message: 'Already a member of this campaign' })
  }

  const now = new Date()

  // Create membership
  db.insert(campaignMembers).values({
    id: randomUUID(),
    campaignId,
    userId: event.context.user.id,
    role: invitation.role,
    joinedAt: now,
  }).run()

  // Mark invitation as used
  db.update(campaignInvitations)
    .set({ usedAt: now })
    .where(eq(campaignInvitations.id, invitation.id))
    .run()

  auditLogFromEvent(event, {
    action: 'campaign_member_join',
    userId: event.context.user.id,
    target: campaignId,
    details: { role: invitation.role },
  })

  return { role: invitation.role, campaignId }
})
