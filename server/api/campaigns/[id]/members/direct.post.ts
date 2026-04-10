import { z } from 'zod'
import { eq, and } from 'drizzle-orm'
import { randomUUID } from 'crypto'
import { useDb } from '../../../../utils/db'
import { validateBody } from '../../../../utils/validate'
import { campaignMembers } from '../../../../db/schema/campaign-members'
import { user } from '../../../../db/schema/auth'
import { hasMinRole } from '../../../../utils/permissions'
import type { CampaignRole } from '../../../../utils/permissions'

const VALID_ROLES = ['co_dm', 'editor', 'player', 'visitor'] as const

const bodySchema = z.object({
  userId: z.string().min(1),
  role: z.enum(VALID_ROLES),
})

export default defineEventHandler(async (event) => {
  const role = event.context.campaignRole as CampaignRole
  if (!hasMinRole(role, 'co_dm')) {
    throw createError({ statusCode: 403, message: 'Only DM or Co-DM can add members directly' })
  }

  const body = await validateBody(event, bodySchema)
  const campaignId = getRouterParam(event, 'id')!
  const db = useDb()

  // Check target user exists
  const targetUser = db.select().from(user).where(eq(user.id, body.userId)).get()
  if (!targetUser) {
    throw createError({ statusCode: 404, message: 'User not found' })
  }

  // Check not already a member
  const existing = db
    .select()
    .from(campaignMembers)
    .where(and(eq(campaignMembers.campaignId, campaignId), eq(campaignMembers.userId, body.userId)))
    .get()
  if (existing) {
    throw createError({ statusCode: 409, message: 'User is already a member of this campaign' })
  }

  const id = randomUUID()
  db.insert(campaignMembers)
    .values({
      id,
      campaignId,
      userId: body.userId,
      role: body.role,
      joinedAt: new Date(),
    })
    .run()

  setResponseStatus(event, 201)
  return {
    id,
    userId: body.userId,
    name: targetUser.name,
    role: body.role,
    joinedAt: new Date(),
  }
})
