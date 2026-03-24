import { eq, or } from 'drizzle-orm'
import { useDb } from '../../../../utils/db'
import { entityRelations } from '../../../../db/schema/relations'
import { getRelationLabel } from '../../../../services/relationships'
import { filterPinsByVisibility } from '../../../../services/maps'
import type { CampaignRole } from '../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const campaignId = getRouterParam(event, 'id')!
  const query = getQuery(event)
  const role = (event.context.campaignRole || 'visitor') as CampaignRole
  const entityId = query.entity_id as string | undefined
  const db = useDb()

  let results: any[]

  if (entityId) {
    // Entity-centered query
    results = db.select().from(entityRelations)
      .where(or(
        eq(entityRelations.sourceEntityId, entityId),
        eq(entityRelations.targetEntityId, entityId),
      ))
      .all()

    // Add resolved labels
    results = results.map(r => ({
      ...r,
      label: getRelationLabel(r, entityId),
      relatedEntityId: r.sourceEntityId === entityId ? r.targetEntityId : r.sourceEntityId,
    }))
  } else {
    // Campaign-wide
    results = db.select().from(entityRelations)
      .where(eq(entityRelations.campaignId, campaignId))
      .all()
  }

  // Filter by visibility
  results = filterPinsByVisibility(results, role)

  // Filter by relation type
  if (query.relation_type) {
    results = results.filter(r => r.relationTypeId === query.relation_type)
  }

  return results
})
