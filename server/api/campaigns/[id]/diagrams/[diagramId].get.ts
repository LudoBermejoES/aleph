import { eq, and } from 'drizzle-orm'
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
  const diagramId = getRouterParam(event, 'diagramId')!
  const db = useDb()

  const diagram = db
    .select()
    .from(diagrams)
    .where(and(eq(diagrams.id, diagramId), eq(diagrams.campaignId, campaignId)))
    .get()

  if (!diagram) {
    throw createError({ statusCode: 404, message: 'Diagram not found' })
  }

  return diagram
})
