import { watch, type Ref } from 'vue'

export interface EditorForDimming {
  getCurrentPageShapes: () => { id: string; type: string; props?: Record<string, unknown> }[]
  getBindingsFromShape: (
    shapeId: string,
    type: string,
  ) => { toId: string; props: { terminal: string } }[]
  updateShapes: (updates: { id: string; type: string; opacity: number }[]) => void
}

/**
 * Dim unrelated arrows when an entity shape is selected.
 * Watches `selectedShapeId` and highlights/restores arrow opacity automatically.
 */
export function useArrowDimming(editor: EditorForDimming, selectedShapeId: Ref<string>) {
  let isUpdating = false

  function highlightRelatedArrows(shapeId: string) {
    const allShapes = editor.getCurrentPageShapes()
    const arrows = allShapes.filter((s) => s.type === 'arrow')
    if (arrows.length === 0) return

    const connectedArrowIds = new Set<string>()
    for (const arrow of arrows) {
      const bindings = editor.getBindingsFromShape(arrow.id, 'arrow')
      for (const b of bindings) {
        if (b.toId === shapeId) {
          connectedArrowIds.add(arrow.id)
          break
        }
      }
    }

    const updates: { id: string; type: string; opacity: number }[] = []
    for (const arrow of arrows) {
      updates.push({
        id: arrow.id,
        type: 'arrow',
        opacity: connectedArrowIds.has(arrow.id) ? 1 : 0.15,
      })
    }
    if (updates.length > 0) {
      isUpdating = true
      editor.updateShapes(updates)
      isUpdating = false
    }
  }

  function restoreArrowOpacities() {
    const allShapes = editor.getCurrentPageShapes()
    const updates: { id: string; type: string; opacity: number }[] = []
    for (const shape of allShapes) {
      if (shape.type === 'arrow') {
        updates.push({ id: shape.id, type: 'arrow', opacity: 1 })
      }
    }
    if (updates.length > 0) {
      isUpdating = true
      editor.updateShapes(updates)
      isUpdating = false
    }
  }

  watch(selectedShapeId, (newId) => {
    if (isUpdating) return
    if (newId) {
      highlightRelatedArrows(newId)
    } else {
      restoreArrowOpacities()
    }
  })
}
