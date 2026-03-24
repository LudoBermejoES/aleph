import { eq } from 'drizzle-orm'
import { useDb } from '../../../../utils/db'
import { campaignMembers } from '../../../../db/schema/campaign-members'
import { user } from '../../../../db/schema/auth'

export default defineEventHandler(async (event) => {
  const campaignId = getRouterParam(event, 'id')!
  const db = useDb()

  const members = db.select({
    id: campaignMembers.id,
    userId: campaignMembers.userId,
    name: user.name,
    email: user.email,
    role: campaignMembers.role,
    joinedAt: campaignMembers.joinedAt,
  })
    .from(campaignMembers)
    .innerJoin(user, eq(campaignMembers.userId, user.id))
    .where(eq(campaignMembers.campaignId, campaignId))
    .all()

  return members
})
