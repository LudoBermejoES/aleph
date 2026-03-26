<template>
  <div class="border border-border rounded-lg overflow-hidden" :style="{ height: height + 'px' }">
    <div v-if="hasData" ref="containerRef" class="w-full h-full" />
    <div v-else class="flex items-center justify-center h-full text-muted-foreground">
      <p>No relationships to display.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  nodes: Record<string, { name: string; type: string }>
  edges: Record<string, { source: string; target: string; label: string; color: string; attitude?: number }>
  height?: number
  campaignId?: string
}>()

const emit = defineEmits<{
  nodeClick: [nodeId: string]
}>()

const containerRef = ref<HTMLElement | null>(null)
const hasData = computed(() => Object.keys(props.nodes || {}).length > 0)

// Node colors by type (matches EntityGraphView palette)
const TYPE_COLORS: Record<string, string> = {
  character: '#3b82f6',
  location: '#10b981',
  organization: '#f59e0b',
  item: '#8b5cf6',
  event: '#ef4444',
}

function getNodeColor(type: string): string {
  return TYPE_COLORS[type?.toLowerCase()] ?? '#6b7280'
}

onMounted(async () => {
  if (!hasData.value || !containerRef.value) return

  const cytoscape = (await import('cytoscape')).default
  const coseBilkent = (await import('cytoscape-cose-bilkent')).default
  cytoscape.use(coseBilkent)

  const elements = [
    ...Object.entries(props.nodes).map(([id, node]) => ({
      data: { id, label: `${node.name}\n(${node.type})`, color: getNodeColor(node.type) },
    })),
    ...Object.entries(props.edges).map(([id, edge]) => ({
      data: { id, source: edge.source, target: edge.target, label: edge.label, color: edge.color || '#9ca3af' },
    })),
  ]

  const cy = cytoscape({
    container: containerRef.value,
    elements,
    layout: {
      name: 'cose-bilkent',
      animate: false,
      nodeDimensionsIncludeLabels: true,
      idealEdgeLength: 120,
      nodeRepulsion: 4500,
      gravity: 0.25,
      numIter: 2500,
    } as any,
    style: [
      {
        selector: 'node',
        style: {
          label: 'data(label)',
          'background-color': 'data(color)',
          color: '#374151',
          'font-size': 10,
          'text-valign': 'bottom',
          'text-halign': 'center',
          'text-wrap': 'wrap',
          'text-max-width': '80px',
          width: 36,
          height: 36,
        },
      },
      {
        selector: 'edge',
        style: {
          label: 'data(label)',
          'line-color': 'data(color)',
          'target-arrow-color': 'data(color)',
          'target-arrow-shape': 'triangle',
          'curve-style': 'bezier',
          'font-size': 9,
          color: '#6b7280',
          'text-rotation': 'autorotate',
          width: 2,
        },
      },
      {
        selector: 'node:selected',
        style: { 'border-width': 2, 'border-color': '#2563eb' },
      },
    ],
  })

  cy.on('tap', 'node', (evt) => {
    emit('nodeClick', evt.target.id())
  })
})
</script>
