<template>
  <div class="border border-border rounded-lg overflow-hidden" :style="{ height: height + 'px' }">
    <ClientOnly>
      <div v-if="hasData" class="w-full h-full">
        <v-network-graph
          :nodes="graphNodes"
          :edges="graphEdges"
          :configs="configs"
          :event-handlers="eventHandlers"
        />
      </div>
      <div v-else class="flex items-center justify-center h-full text-muted-foreground">
        <p>No relationships to display.</p>
      </div>
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
import { VNetworkGraph } from 'v-network-graph'
import 'v-network-graph/lib/style.css'
import { defineConfigs } from 'v-network-graph'

const props = defineProps<{
  nodes: Record<string, { name: string; type: string }>
  edges: Record<string, { source: string; target: string; label: string; color: string; attitude?: number }>
  height?: number
  campaignId?: string
}>()

const emit = defineEmits<{
  nodeClick: [nodeId: string]
}>()

const hasData = computed(() => Object.keys(props.nodes || {}).length > 0)

const graphNodes = computed(() => {
  const result: Record<string, { name: string }> = {}
  for (const [id, node] of Object.entries(props.nodes || {})) {
    result[id] = { name: `${node.name}\n(${node.type})` }
  }
  return result
})

const graphEdges = computed(() => {
  const result: Record<string, { source: string; target: string; label: string }> = {}
  for (const [id, edge] of Object.entries(props.edges || {})) {
    result[id] = { source: edge.source, target: edge.target, label: edge.label }
  }
  return result
})

const configs = defineConfigs({
  view: {
    autoPanAndZoomOnLoad: 'fit-content',
    scalingObjects: true,
  },
  node: {
    normal: {
      radius: 20,
      color: '#3b82f6',
    },
    label: {
      fontSize: 11,
      direction: 'south',
      color: '#374151',
    },
  },
  edge: {
    normal: {
      color: (edge: any) => {
        const e = props.edges?.[edge.id]
        return e?.color || '#9ca3af'
      },
      width: 2,
    },
    label: {
      fontSize: 10,
      color: '#6b7280',
    },
  },
})

const eventHandlers = {
  'node:click': ({ node }: { node: string }) => {
    emit('nodeClick', node)
  },
}
</script>
