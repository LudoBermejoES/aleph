import { hasMinRole } from '../../../../utils/permissions'
import type { CampaignRole } from '../../../../utils/permissions'

// POST /api/campaigns/:id/diagrams/reflow
// Body: { entityIds: string[], diagramType: string }
// Returns: { positions: Record<entityId, { x, y }> }
// Requires editor+ role
export default defineEventHandler(async (event) => {
  const role = event.context.campaignRole as CampaignRole
  if (!hasMinRole(role, 'editor')) {
    throw createError({ statusCode: 403, message: 'Editor role required to reflow diagram' })
  }

  const body = await readBody<{ entityIds: string[]; diagramType: string }>(event)
  const entityIds: string[] = Array.isArray(body?.entityIds) ? body.entityIds : []
  const diagramType: string = body?.diagramType ?? 'entity-graph'

  if (entityIds.length === 0) {
    return { positions: {} }
  }

  const positions: Record<string, { x: number; y: number }> = {}

  if (diagramType === 'quest-tree') {
    // Tree layout: rows of 4 per level
    const cols = 4
    entityIds.forEach((id, i) => {
      positions[id] = {
        x: (i % cols) * 260 + 50,
        y: Math.floor(i / cols) * 120 + 50,
      }
    })
  } else if (diagramType === 'session-timeline') {
    // Linear layout
    entityIds.forEach((id, i) => {
      positions[id] = {
        x: i * 260 + 50,
        y: 200,
      }
    })
  } else {
    // Grid layout for entity-graph and faction-web
    const cols = Math.ceil(Math.sqrt(entityIds.length))
    entityIds.forEach((id, i) => {
      positions[id] = {
        x: (i % cols) * 240 + 50,
        y: Math.floor(i / cols) * 140 + 50,
      }
    })
  }

  return { positions }
})
