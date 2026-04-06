import { eq, desc } from 'drizzle-orm'
import { useDb } from '../../../../utils/db'
import { diagrams } from '../../../../db/schema/diagrams'
import { hasMinRole } from '../../../../utils/permissions'
import type { CampaignRole } from '../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const role = event.context.campaignRole as CampaignRole
  if (!hasMinRole(role, 'player')) {
    throw createError({ statusCode: 403, message: 'Members can view diagrams' })
  }

  const campaignId = getRouterParam(event, 'id')!
  const db = useDb()

  const data = db
    .select()
    .from(diagrams)
    .where(eq(diagrams.campaignId, campaignId))
    .orderBy(desc(diagrams.updatedAt))
    .all()

  return data
})
