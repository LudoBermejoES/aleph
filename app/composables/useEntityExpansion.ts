import { radialLayout } from '~/utils/diagram-layout'
import { buildShapeCreateArgs } from '~/utils/diagram-shapes'

export interface EditorForExpansion {
  getCurrentPageShapes: () => { id: string; type: string; props?: Record<string, unknown> }[]
  createShape: (shape: Record<string, unknown>) => unknown
  getShape: (id: string) => { x: number; y: number } | undefined
}

interface GraphNode {
  name: string
  type: string
  slug: string
  image?: string | null
}

/**
 * Composable for expanding related entities around a selected org or location.
 * Returns an `expandRelatedEntities()` function.
 */
export function useEntityExpansion(
  getEditor: () => EditorForExpansion | null,
  campaignId: string,
  onComplete: () => void,
) {
  async function expandRelatedEntities(entityId: string, entityType: string) {
    const ed = getEditor()
    if (!ed || !entityId) return

    // Find the selected shape's position
    let centerX = 400
    let centerY = 400
    for (const shape of ed.getCurrentPageShapes()) {
      if (shape.props?.entityId === entityId) {
        const full = ed.getShape(shape.id)
        if (full) {
          centerX = full.x
          centerY = full.y
        }
        break
      }
    }

    // Fetch graph data
    let graphData: {
      nodes: Record<string, GraphNode>
      edges: Record<string, { source: string; target: string }>
    }
    try {
      graphData = await $fetch(`/api/campaigns/${campaignId}/graph`)
    } catch {
      return
    }

    // Collect entity IDs already on canvas
    const onCanvas = new Set<string>()
    for (const shape of ed.getCurrentPageShapes()) {
      if (shape.props?.entityId) onCanvas.add(shape.props.entityId as string)
    }

    // Find related entity IDs based on type (deduplicated)
    const relatedIdSet = new Set<string>()
    for (const [key, edge] of Object.entries(graphData.edges)) {
      if (entityType === 'organization') {
        if (
          (key.startsWith('org-member:') || key.startsWith('org-location:')) &&
          edge.source === entityId
        ) {
          if (!onCanvas.has(edge.target)) relatedIdSet.add(edge.target)
        }
      } else if (entityType === 'location') {
        if (key.startsWith('char-location:') && edge.target === entityId) {
          if (!onCanvas.has(edge.source)) relatedIdSet.add(edge.source)
        }
        if (key.startsWith('org-location:') && edge.target === entityId) {
          if (!onCanvas.has(edge.source)) relatedIdSet.add(edge.source)
        }
      } else if (entityType === 'character') {
        if (edge.source === entityId && !onCanvas.has(edge.target)) relatedIdSet.add(edge.target)
        if (edge.target === entityId && !onCanvas.has(edge.source)) relatedIdSet.add(edge.source)
      }
    }
    const relatedIds = Array.from(relatedIdSet)

    if (relatedIds.length === 0) {
      onComplete()
      return
    }

    // Compute positions and create shapes
    const positions = radialLayout(centerX, centerY, relatedIds.length, 500)
    for (let i = 0; i < relatedIds.length; i++) {
      const id = relatedIds[i]!
      const node = graphData.nodes[id]
      if (!node) continue
      const pos = positions[i]!

      const { type, props } = buildShapeCreateArgs(
        node.type,
        { id, name: node.name, slug: node.slug, image: node.image },
        campaignId,
      )
      // Offset by half dimensions for centering
      const w = (props.w as number) ?? 140
      const h = (props.h as number) ?? 100
      ed.createShape({ type, x: pos.x - w / 2, y: pos.y - h / 2, props })
    }

    onComplete()
  }

  return { expandRelatedEntities }
}
