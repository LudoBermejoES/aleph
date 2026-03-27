<template>
  <div class="border border-border rounded-lg overflow-hidden" :style="{ height: height + 'px' }">
    <ClientOnly>
      <div v-if="hasData" class="w-full h-full">
        <v-network-graph
          :nodes="graphNodes"
          :edges="graphEdges"
          :configs="configs"
          :layouts="radialLayouts"
          :layout-handler="props.centerNodeId ? undefined : forceLayout"
          :event-handlers="eventHandlers"
        >
          <template #override-node="{ nodeId, scale, config }">
            <template v-if="props.nodes[nodeId]?.image">
              <!-- Circular portrait image -->
              <defs>
                <clipPath :id="`clip-${nodeId}`">
                  <circle :r="config.radius * scale" cx="0" cy="0" />
                </clipPath>
              </defs>
              <circle
                :r="config.radius * scale"
                cx="0"
                cy="0"
                fill="#e5e7eb"
                stroke="#d1d5db"
                stroke-width="1.5"
              />
              <image
                :href="props.nodes[nodeId].image"
                :x="-(config.radius * scale)"
                :y="-(config.radius * scale)"
                :width="config.radius * scale * 2"
                :height="config.radius * scale * 2"
                :clip-path="`url(#clip-${nodeId})`"
                preserveAspectRatio="xMidYMid slice"
              />
            </template>
            <!-- No image: plain colored circle -->
            <circle
              v-else
              :r="config.radius * scale"
              cx="0"
              cy="0"
              :fill="nodeTypeColor(nodeId)"
            />
          </template>
        </v-network-graph>
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
import { ForceLayout } from 'v-network-graph/lib/force-layout'

const props = defineProps<{
  nodes: Record<string, { name: string; type: string; image?: string | null }>
  edges: Record<string, { source: string; target: string; label: string; color: string; attitude?: number }>
  height?: number
  campaignId?: string
  centerNodeId?: string
}>()

const emit = defineEmits<{
  nodeClick: [nodeId: string]
}>()

const TYPE_COLORS: Record<string, string> = {
  character: '#3b82f6',
  location: '#10b981',
  organization: '#f59e0b',
  item: '#8b5cf6',
  event: '#ef4444',
}

function nodeTypeColor(nodeId: string): string {
  const type = props.nodes[nodeId]?.type?.toLowerCase() ?? ''
  return TYPE_COLORS[type] ?? '#6b7280'
}

const hasData = computed(() => Object.keys(props.nodes || {}).length > 0)

const radialLayouts = computed(() => {
  const nodeIds = Object.keys(props.nodes || {})
  if (!props.centerNodeId || nodeIds.length === 0) return { nodes: {} }

  const positions: Record<string, { x: number; y: number }> = {}
  positions[props.centerNodeId] = { x: 0, y: 0 }

  const others = nodeIds.filter(id => id !== props.centerNodeId)
  const radius = Math.max(160, others.length * 30)
  others.forEach((id, i) => {
    const angle = (2 * Math.PI * i) / others.length - Math.PI / 2
    positions[id] = { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius }
  })

  return { nodes: positions }
})

const forceLayout = new ForceLayout({ positionFixedByDrag: true })

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
      color: (node: any) => nodeTypeColor(node.id),
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
