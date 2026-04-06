<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import type { MountedCanvas } from './react/mount'

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
let mounted: MountedCanvas | null = null

let editorInstance: unknown = null

function makeProps(snapshotVal?: Record<string, unknown>, readOnlyVal?: boolean) {
  return {
    // Strip Vue reactive proxy — pass plain JS to React
    snapshot: snapshotVal ? JSON.parse(JSON.stringify(snapshotVal)) : undefined,
    readOnly: readOnlyVal ?? false,
    onChange: (snapshot: unknown) => emit('save', snapshot as Record<string, unknown>),
    onEditorReady: (editor: unknown) => {
      editorInstance = editor
      emit('editorReady', editor)
      const ed = editor as {
        store: { listen: (fn: () => void, opts: Record<string, unknown>) => void }
        getCurrentPageShapes: () => { props?: { entityId?: string } }[]
      }
      ed.store.listen(
        () => {
          const counts = new Map<string, number>()
          for (const shape of ed.getCurrentPageShapes()) {
            const id = shape.props?.entityId
            if (id) counts.set(id, (counts.get(id) ?? 0) + 1)
          }
          emit('placedEntitiesChange', counts)
        },
        { scope: 'document', source: 'user' },
      )
    },
    onDrop: (event: DragEvent, editor: unknown) => emit('drop', event, editor),
  }
}

onMounted(async () => {
  if (!containerRef.value) return
  const { mountTldrawCanvas } = await import('./react/mount')
  mounted = mountTldrawCanvas(containerRef.value, makeProps(props.snapshot, props.readOnly))

  // Use native DOM listeners to bypass React's synthetic event delegation,
  // which does not reliably fire for drops inside tldraw's own event handlers.
  containerRef.value.addEventListener('dragover', (e) => e.preventDefault())
  containerRef.value.addEventListener('drop', (e: DragEvent) => {
    e.preventDefault()
    if (editorInstance) emit('drop', e, editorInstance)
  })
})

watch(
  () => props.snapshot,
  (val) => mounted?.update(makeProps(val, props.readOnly)),
)

onUnmounted(() => {
  mounted?.unmount()
  mounted = null
})
</script>

<template>
  <div ref="containerRef" style="width: 100%; height: 100%" />
</template>
