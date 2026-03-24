import { eq, and } from 'drizzle-orm'
import { useDb } from '../utils/db'
import { campaignMembers } from '../db/schema/campaign-members'
import { campaigns } from '../db/schema/campaigns'
import type { CampaignRole } from '../utils/permissions'

export default defineEventHandler(async (event) => {
  const path = getRequestURL(event).pathname
  const match = path.match(/^\/api\/campaigns\/([^/]+)/)
  if (!match) return
  if (!event.context.user) return

  const campaignId = match[1]

  // Verify campaign exists
  const db = useDb()
  const campaign = db.select().from(campaigns).where(eq(campaigns.id, campaignId)).get()

  if (!campaign) {
    throw createError({ statusCode: 404, message: 'Campaign not found' })
  }

  // Get membership
  const membership = db.select()
    .from(campaignMembers)
    .where(and(
      eq(campaignMembers.campaignId, campaignId),
      eq(campaignMembers.userId, event.context.user.id),
    ))
    .get()

  if (!membership) {
    // Allow public campaigns for visitors
    if (campaign.isPublic) {
      event.context.campaignRole = 'visitor' as CampaignRole
      event.context.campaign = campaign
      return
    }
    throw createError({ statusCode: 403, message: 'Not a campaign member' })
  }

  event.context.campaignRole = membership.role as CampaignRole
  event.context.campaignMemberId = membership.id
  event.context.campaign = campaign
})
