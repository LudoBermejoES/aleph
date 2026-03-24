import { eq } from 'drizzle-orm'
import { useDb } from '../../utils/db'
import { campaigns } from '../../db/schema/campaigns'
import { campaignMembers } from '../../db/schema/campaign-members'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  const db = useDb()

  const results = db.select({
    id: campaigns.id,
    name: campaigns.name,
    slug: campaigns.slug,
    description: campaigns.description,
    isPublic: campaigns.isPublic,
    role: campaignMembers.role,
    createdAt: campaigns.createdAt,
  })
    .from(campaignMembers)
    .innerJoin(campaigns, eq(campaignMembers.campaignId, campaigns.id))
    .where(eq(campaignMembers.userId, user.id))
    .all()

  return results
})
