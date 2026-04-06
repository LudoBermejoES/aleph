<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'

const props = defineProps<{
  snapshot?: Record<string, unknown>
  readOnly?: boolean
}>()

const emit = defineEmits<{
  save: [snapshot: Record<string, unknown>]
  editorReady: [editor: unknown]
  drop: [event: DragEvent, editor: unknown]
  placedEntitiesChange: [counts: Map<string, number>]
}>()

const containerRef = ref<HTMLDivElement>()
let reactRoot: { render: (el: unknown) => void; unmount: () => void } | null = null

async function mountReact(snapshotVal?: Record<string, unknown>, readOnlyVal?: boolean) {
  if (!containerRef.value) return

  const [{ createRoot }, { createElement }, { TldrawWrapper }] = await Promise.all([
    import('react-dom/client'),
    import('react'),
    import('./react/TldrawWrapper'),
  ])

  const handleChange = (snapshot: unknown) => {
    emit('save', snapshot as Record<string, unknown>)
  }

  const handleEditorReady = (editor: unknown) => {
    emit('editorReady', editor)
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

  // Pass plain JS values — no Vue reactive proxies
  const element = createElement(TldrawWrapper, {
    snapshot: snapshotVal ? JSON.parse(JSON.stringify(snapshotVal)) : undefined,
    readOnly: readOnlyVal ?? false,
    onChange: handleChange,
    onEditorReady: handleEditorReady,
    onDrop: handleDrop,
  })

  if (!reactRoot) {
    reactRoot = createRoot(containerRef.value)
  }
  reactRoot.render(element)
}

onMounted(() => {
  mountReact(props.snapshot, props.readOnly)
})

// Re-render when snapshot changes (e.g. loaded after mount)
watch(
  () => props.snapshot,
  (val) => {
    mountReact(val, props.readOnly)
  },
)

onUnmounted(() => {
  reactRoot?.unmount()
  reactRoot = null
  currentEditor = null
})
</script>

<template>
  <div ref="containerRef" style="width: 100%; height: 100%" />
</template>
