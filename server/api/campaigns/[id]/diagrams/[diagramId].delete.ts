import { eq, and } from 'drizzle-orm'
import { useDb } from '../../../../utils/db'
import { diagrams } from '../../../../db/schema/diagrams'
import { hasMinRole } from '../../../../utils/permissions'
import type { CampaignRole } from '../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const role = event.context.campaignRole as CampaignRole
  if (!hasMinRole(role, 'co_dm')) {
    throw createError({ statusCode: 403, message: 'Co-DM or above can delete diagrams' })
  }

  const campaignId = getRouterParam(event, 'id')!
  const diagramId = getRouterParam(event, 'diagramId')!
  const db = useDb()

  const existing = db
    .select()
    .from(diagrams)
    .where(and(eq(diagrams.id, diagramId), eq(diagrams.campaignId, campaignId)))
    .get()

  if (!existing) {
    throw createError({ statusCode: 404, message: 'Diagram not found' })
  }

  // Snapshots cascade delete via FK
  db.delete(diagrams).where(eq(diagrams.id, diagramId)).run()

  return { success: true }
})
