<template>
  <div class="p-8">
    <div class="flex items-center gap-2 text-sm text-muted-foreground mb-1">
      <NuxtLink :to="`/campaigns/${campaignId}`" class="hover:text-primary">Campaign</NuxtLink>
      <span>/</span>
      <span>Relationship Graph</span>
    </div>

    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold">Relationship Graph</h1>
      <NuxtLink :to="`/campaigns/${campaignId}/relations/new`">
        <Button data-testid="new-relation-btn">New Relation</Button>
      </NuxtLink>
    </div>

    <!-- Filter Panel -->
    <div v-if="graphData && Object.keys(graphData.nodes).length" class="flex gap-4 mb-4 flex-wrap">
      <div class="space-y-1">
        <label class="text-xs font-medium text-muted-foreground">Entity Types</label>
        <div class="flex gap-2">
          <label v-for="t in entityTypes" :key="t" class="flex items-center gap-1 text-xs">
            <input type="checkbox" :checked="selectedTypes.has(t)" @change="toggleType(t)" />
            {{ t }}
          </label>
        </div>
      </div>
    </div>

    <!-- Graph: Cytoscape fallback above 500 nodes, v-network-graph below -->
    <div v-if="graphData && Object.keys(filteredNodes).length">
      <CytoscapeGraphView
        v-if="Object.keys(filteredNodes).length > 500"
        :nodes="filteredNodes"
        :edges="filteredEdges"
        :height="600"
        :campaign-id="campaignId"
        @node-click="onNodeClick"
      />
      <EntityGraphView
        v-else
        :nodes="filteredNodes"
        :edges="filteredEdges"
        :height="600"
        :campaign-id="campaignId"
        @node-click="onNodeClick"
      />
      <p class="text-xs text-muted-foreground mt-2">
        {{ Object.keys(filteredNodes).length }} nodes, {{ Object.keys(filteredEdges).length }} edges
        <span v-if="Object.keys(filteredNodes).length > 500" class="ml-2 text-amber-600">(large graph — using Cytoscape renderer)</span>
      </p>
    </div>
    <p v-else class="text-muted-foreground text-center py-16">No relationships yet. Click "New Relation" to connect entities.</p>
  </div>
</template>

<script setup lang="ts">
import type { GraphData } from '~/types/api'
const route = useRoute()
const campaignId = route.params.id as string
const api = useCampaignApi(campaignId)
const graphData = ref<GraphData | null>(null)
const selectedTypes = ref(new Set<string>())

// Graph
const entityTypes = computed(() => {
  if (!graphData.value) return []
  const types = new Set<string>()
  for (const node of Object.values(graphData.value.nodes)) {
    types.add(node.type)
  }
  return Array.from(types).sort()
})

const filteredNodes = computed(() => {
  if (!graphData.value) return {}
  if (selectedTypes.value.size === 0) return graphData.value.nodes
  const result: Record<string, any> = {}
  for (const [id, node] of Object.entries(graphData.value.nodes) as [string, any][]) {
    if (selectedTypes.value.has(node.type)) result[id] = node
  }
  return result
})

const filteredEdges = computed(() => {
  if (!graphData.value) return {}
  const nodeIds = new Set(Object.keys(filteredNodes.value))
  const result: Record<string, any> = {}
  for (const [id, edge] of Object.entries(graphData.value.edges) as [string, any][]) {
    if (nodeIds.has(edge.source) && nodeIds.has(edge.target)) result[id] = edge
  }
  return result
})

function toggleType(type: string) {
  const s = new Set(selectedTypes.value)
  if (s.has(type)) s.delete(type)
  else s.add(type)
  selectedTypes.value = s
}

function onNodeClick(nodeId: string) {
  // TODO: navigate to entity by ID
}

async function load() {
  try { graphData.value = await api.getGraph() } catch { graphData.value = null }
  if (graphData.value) {
    selectedTypes.value = new Set(entityTypes.value)
  }
}

onMounted(load)
</script>
