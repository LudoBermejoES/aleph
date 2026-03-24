import { eq } from 'drizzle-orm'
import { useDb } from '../../../../utils/db'
import { campaignMembers } from '../../../../db/schema/campaign-members'
import { users } from '../../../../db/schema/users'

export default defineEventHandler(async (event) => {
  const campaignId = getRouterParam(event, 'id')!
  const db = useDb()

  const members = db.select({
    id: campaignMembers.id,
    userId: campaignMembers.userId,
    username: users.username,
    email: users.email,
    role: campaignMembers.role,
    joinedAt: campaignMembers.joinedAt,
  })
    .from(campaignMembers)
    .innerJoin(users, eq(campaignMembers.userId, users.id))
    .where(eq(campaignMembers.campaignId, campaignId))
    .all()

  return members
})
