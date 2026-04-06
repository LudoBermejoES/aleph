<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'

const props = defineProps<{
  snapshot?: Record<string, unknown>
  readOnly?: boolean
  placedEntityIds?: Map<string, number>
}>()

const emit = defineEmits<{
  save: [snapshot: Record<string, unknown>]
  editorReady: [editor: unknown]
  drop: [event: DragEvent, editor: unknown]
  placedEntitiesChange: [counts: Map<string, number>]
}>()

const containerRef = ref<HTMLDivElement>()
let reactRoot: { unmount(): void } | null = null

onMounted(async () => {
  if (!containerRef.value) return

  const { createRoot } = await import('react-dom/client')
  const { createElement } = await import('react')
  const { TldrawWrapper } = await import('./react/TldrawWrapper')

  const handleChange = (snapshot: unknown) => {
    emit('save', snapshot as Record<string, unknown>)
  }

  const handleEditorReady = (editor: unknown) => {
    emit('editorReady', editor)
    // Start listening for shape changes to track placed entities
    const editorAny = editor as {
      store: { listen: (fn: () => void, opts: Record<string, unknown>) => void }
      getCurrentPageShapes: () => { props?: { entityId?: string } }[]
    }
    editorAny.store.listen(
      () => {
        const shapes = editorAny.getCurrentPageShapes()
        const counts = new Map<string, number>()
        for (const shape of shapes) {
          const entityId = shape.props?.entityId
          if (entityId) {
            counts.set(entityId, (counts.get(entityId) ?? 0) + 1)
          }
        }
        emit('placedEntitiesChange', counts)
      },
      { scope: 'document', source: 'user' },
    )
  }

  const handleDrop = (event: DragEvent, editor: unknown) => {
    emit('drop', event, editor)
  }

  const element = createElement(TldrawWrapper, {
    snapshot: props.snapshot as never,
    readOnly: props.readOnly,
    onChange: handleChange,
    onEditorReady: handleEditorReady,
    onDrop: handleDrop,
  })

  reactRoot = createRoot(containerRef.value)
  reactRoot.render(element)
})

onUnmounted(() => {
  reactRoot?.unmount()
  reactRoot = null
})
</script>

<template>
  <div ref="containerRef" class="tldraw-canvas-container" style="width: 100%; height: 100%" />
</template>
