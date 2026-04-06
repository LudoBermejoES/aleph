import { eq, and, desc } from 'drizzle-orm'
import { useDb } from '../../../../../utils/db'
import { diagrams, diagramSnapshots } from '../../../../../db/schema/diagrams'
import { hasMinRole } from '../../../../../utils/permissions'
import type { CampaignRole } from '../../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const role = event.context.campaignRole as CampaignRole
  if (!hasMinRole(role, 'player')) {
    throw createError({ statusCode: 403, message: 'Members can view diagrams' })
  }

  const campaignId = getRouterParam(event, 'id')!
  const diagramId = getRouterParam(event, 'diagramId')!
  const db = useDb()

  const diagram = db
    .select({ id: diagrams.id })
    .from(diagrams)
    .where(and(eq(diagrams.id, diagramId), eq(diagrams.campaignId, campaignId)))
    .get()

  if (!diagram) {
    throw createError({ statusCode: 404, message: 'Diagram not found' })
  }

  const snapshot = db
    .select()
    .from(diagramSnapshots)
    .where(eq(diagramSnapshots.diagramId, diagramId))
    .orderBy(desc(diagramSnapshots.version))
    .limit(1)
    .get()

  if (!snapshot) {
    throw createError({ statusCode: 404, message: 'No snapshot found' })
  }

  return { snapshot: JSON.parse(snapshot.snapshot), version: snapshot.version }
})
