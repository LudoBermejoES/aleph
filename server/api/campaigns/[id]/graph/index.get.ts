import { useDb } from '../../../../utils/db'
import { buildGraphForCampaign } from '../../../../services/graph-builder'
import type { CampaignRole } from '../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const campaignId = getRouterParam(event, 'id')!
  const role = (event.context.campaignRole || 'visitor') as CampaignRole
  const userId = event.context.user?.id || ''
  const db = useDb()

  const query = getQuery(event)
  const rawIds = query.entityIds
  const entityIds: string[] | null = rawIds
    ? Array.isArray(rawIds)
      ? rawIds
      : String(rawIds).split(',')
    : null

  const graph = buildGraphForCampaign(db, campaignId, role, userId)

  if (!entityIds || entityIds.length === 0) return graph

  const entitySet = new Set(entityIds)
  const filteredEdges = Object.fromEntries(
    Object.entries(graph.edges).filter(
      ([, edge]) => entitySet.has(edge.source) && entitySet.has(edge.target),
    ),
  )
  return { edges: filteredEdges }
})
