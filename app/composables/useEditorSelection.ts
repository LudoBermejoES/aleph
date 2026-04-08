import { ref } from 'vue'
import { ENTITY_SHAPE_TYPES, getEntityTypeFromShape } from '~/utils/diagram-shapes'

export interface EditorForSelection {
  store: { listen: (fn: () => void, opts: Record<string, unknown>) => () => void }
  getSelectedShapes: () => { id: string; type: string; props?: Record<string, unknown> }[]
}

/**
 * Track the currently selected entity shape on the tldraw canvas.
 * Returns reactive refs for the selected entity's ID, type, slug, name, and shape ID.
 */
export function useEditorSelection(editor: EditorForSelection) {
  const selectedEntityId = ref('')
  const selectedEntityType = ref('')
  const selectedEntitySlug = ref('')
  const selectedEntityName = ref('')
  const selectedShapeId = ref('')

  let debounceTimer: ReturnType<typeof setTimeout> | null = null

  editor.store.listen(
    () => {
      if (debounceTimer) clearTimeout(debounceTimer)
      debounceTimer = setTimeout(() => {
        const selected = editor.getSelectedShapes()
        if (
          selected.length === 1 &&
          ENTITY_SHAPE_TYPES.includes(selected[0]!.type) &&
          selected[0]!.props?.entityId
        ) {
          const shape = selected[0]!
          selectedShapeId.value = shape.id
          selectedEntityId.value = shape.props!.entityId as string
          selectedEntityType.value = getEntityTypeFromShape(shape.type)
          selectedEntitySlug.value = (shape.props!.slug as string) ?? ''
          selectedEntityName.value =
            (shape.props!.characterName as string) ??
            (shape.props!.locationName as string) ??
            (shape.props!.factionName as string) ??
            ''
        } else {
          selectedShapeId.value = ''
          selectedEntityId.value = ''
          selectedEntityType.value = ''
          selectedEntitySlug.value = ''
          selectedEntityName.value = ''
        }
      }, 50)
    },
    { scope: 'all', source: 'all' },
  )

  return {
    selectedEntityId,
    selectedEntityType,
    selectedEntitySlug,
    selectedEntityName,
    selectedShapeId,
  }
}
