import { eq } from 'drizzle-orm'
import { useDb } from '../../../../utils/db'
import { entities } from '../../../../db/schema/entities'
import { entityRelations } from '../../../../db/schema/relations'
import { computeAttitudeColor } from '../../../../services/relationships'
import { filterPinsByVisibility } from '../../../../services/maps'
import type { CampaignRole } from '../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const campaignId = getRouterParam(event, 'id')!
  const role = (event.context.campaignRole || 'visitor') as CampaignRole
  const db = useDb()

  // Get all relations (visibility-filtered)
  const allRelations = db.select().from(entityRelations)
    .where(eq(entityRelations.campaignId, campaignId))
    .all()
  const relations = filterPinsByVisibility(allRelations, role)

  // Collect entity IDs involved in relations
  const entityIds = new Set<string>()
  relations.forEach(r => {
    entityIds.add(r.sourceEntityId)
    entityIds.add(r.targetEntityId)
  })

  // Fetch entity data for nodes
  const nodes: Record<string, { name: string; type: string; id: string }> = {}
  for (const eid of entityIds) {
    const ent = db.select({ id: entities.id, name: entities.name, type: entities.type })
      .from(entities).where(eq(entities.id, eid)).get()
    if (ent) nodes[eid] = ent
  }

  // Build v-network-graph format
  const graphNodes = Object.fromEntries(
    Object.entries(nodes).map(([id, n]) => [id, { name: n.name, type: n.type }])
  )

  const graphEdges = Object.fromEntries(
    relations.map(r => [r.id, {
      source: r.sourceEntityId,
      target: r.targetEntityId,
      label: r.forwardLabel,
      color: computeAttitudeColor(r.attitude),
      attitude: r.attitude,
    }])
  )

  return { nodes: graphNodes, edges: graphEdges }
})
