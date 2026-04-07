<template>
  <div class="p-8">
    <div class="flex items-center gap-2 text-sm text-muted-foreground mb-1">
      <NuxtLink :to="`/campaigns/${campaignId}`" class="hover:text-primary">
        {{ $t('common.campaign') }}</NuxtLink
      >
      <span>/</span>
      <span>{{ $t('graph.title') }}</span>
    </div>

    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold">{{ $t('graph.title') }}</h1>
      <div class="flex items-center gap-2">
        <Button
          v-if="!loading && graphData"
          size="sm"
          :variant="cardLayout ? 'default' : 'outline'"
          :disabled="isCytoscape"
          :title="isCytoscape ? $t('graph.cardLayoutDisabled') : $t('graph.cardLayout')"
          data-testid="card-layout-btn"
          @click="toggleCardLayout"
        >
          <component :is="ICONS.wiki" class="w-4 h-4 mr-1" />
          {{ $t('graph.cardLayout') }}
        </Button>
        <NuxtLink :to="`/campaigns/${campaignId}/relations/new`">
          <Button data-testid="new-relation-btn">{{ $t('graph.new') }}</Button>
        </NuxtLink>
      </div>
    </div>

    <LoadingSkeleton v-if="loading" :rows="3" />
    <ErrorToast v-if="error" :message="error" @dismiss="error = null" />

    <!-- Filter chips -->
    <div
      v-if="!loading && graphData && Object.keys(graphData.nodes).length"
      class="flex items-center gap-2 mb-4 flex-wrap"
    >
      <!-- All chip -->
      <button
        class="flex items-center gap-1 px-2 py-1 rounded-full text-xs border transition-colors"
        :class="
          selectedTypes.size === entityTypes.length
            ? 'bg-primary text-primary-foreground border-primary'
            : 'border-border text-muted-foreground hover:border-primary'
        "
        data-testid="chip-all"
        @click="selectAll"
      >
        {{ $t('graph.chipAll') }}
      </button>

      <!-- Per-type chips -->
      <button
        v-for="t in entityTypes"
        :key="t"
        class="flex items-center gap-1 px-2 py-1 rounded-full text-xs border transition-colors"
        :class="
          selectedTypes.has(t)
            ? 'bg-primary text-primary-foreground border-primary'
            : 'border-border text-muted-foreground hover:border-primary'
        "
        :data-testid="`chip-${t}`"
        @click="toggleType(t)"
      >
        <component :is="typeIcon(t)" class="w-3 h-3" />
        {{ t }}
      </button>

      <!-- Divider -->
      <span class="text-border">|</span>

      <!-- Connected only toggle -->
      <button
        class="flex items-center gap-1 px-2 py-1 rounded-full text-xs border transition-colors"
        :class="
          connectedOnly
            ? 'bg-primary text-primary-foreground border-primary'
            : 'border-border text-muted-foreground hover:border-primary'
        "
        data-testid="chip-connected-only"
        @click="toggleConnectedOnly"
      >
        <component :is="ICONS.graph" class="w-3 h-3" />
        {{ $t('graph.connectedOnly') }}
        <span
          v-if="connectedOnly && hiddenCount > 0"
          class="ml-1 bg-background/30 rounded-full px-1"
          >{{ hiddenCount }}</span
        >
      </button>
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
        :edges="coloredEdges"
        :height="600"
        :campaign-id="campaignId"
        :card-layout="cardLayout"
        @node-click="onNodeClick"
      />
      <GraphLegend :edges="filteredEdges" />
      <p class="text-xs text-muted-foreground mt-2">
        {{
          $t('graph.stats', {
            nodes: Object.keys(filteredNodes).length,
            edges: Object.keys(filteredEdges).length,
          })
        }}
        <span v-if="Object.keys(filteredNodes).length > 500" class="ml-2 text-amber-600">{{
          $t('timelines.largeGraph')
        }}</span>
      </p>
    </div>
    <p v-else class="text-muted-foreground text-center py-16">{{ $t('graph.empty') }}</p>
  </div>
</template>

<script setup lang="ts">
import type { Component } from 'vue'
import type { GraphData } from '~/types/api'
import { ICONS, type IconKey } from '~/utils/icons'
import { relationTypeColor } from '~/utils/graph-helpers'

const route = useRoute()
const campaignId = route.params.id as string
const api = useCampaignApi(campaignId)
const graphData = ref<GraphData | null>(null)
const { loading, error, withLoading } = useLoadingState()
const selectedTypes = ref(new Set<string>())

// ─── LocalStorage keys ────────────────────────────────────────────────────────

const CARD_LAYOUT_KEY = `aleph:graph:cardLayout:${campaignId}`
const FILTER_KEY = `aleph:graph:filter:${campaignId}`
const CONNECTED_KEY = `aleph:graph:connectedOnly:${campaignId}`

// ─── Card layout toggle ───────────────────────────────────────────────────────

const cardLayout = ref(false)

function toggleCardLayout() {
  cardLayout.value = !cardLayout.value
  try {
    localStorage.setItem(CARD_LAYOUT_KEY, String(cardLayout.value))
  } catch {
    /* */
  }
}

const isCytoscape = computed(() => Object.keys(filteredNodes.value).length > 500)

// ─── Connected-only filter ────────────────────────────────────────────────────

const connectedOnly = ref(false)

function toggleConnectedOnly() {
  connectedOnly.value = !connectedOnly.value
  try {
    localStorage.setItem(CONNECTED_KEY, String(connectedOnly.value))
  } catch {
    /* */
  }
}

// ─── Entity type chip filters ─────────────────────────────────────────────────

const TYPE_ICON_MAP: Record<string, IconKey> = {
  character: 'characters',
  location: 'locations',
  organization: 'organizations',
  item: 'items',
  quest: 'quests',
  event: 'sessions',
}

function typeIcon(type: string): Component {
  return ICONS[TYPE_ICON_MAP[type] ?? 'wiki']
}

const entityTypes = computed(() => {
  if (!graphData.value) return []
  const types = new Set<string>()
  for (const node of Object.values(graphData.value.nodes)) types.add(node.type)
  return Array.from(types).sort()
})

function toggleType(type: string) {
  const s = new Set(selectedTypes.value)
  if (s.has(type)) s.delete(type)
  else s.add(type)
  selectedTypes.value = s
  persistFilter()
}

function selectAll() {
  selectedTypes.value = new Set(entityTypes.value)
  persistFilter()
}

function persistFilter() {
  try {
    localStorage.setItem(FILTER_KEY, JSON.stringify(Array.from(selectedTypes.value)))
  } catch {
    /* */
  }
}

// ─── Graph data types ─────────────────────────────────────────────────────────

type GraphNode = NonNullable<GraphData['nodes']>[string]
type GraphEdge = NonNullable<GraphData['edges']>[string]

// ─── Filtered nodes/edges ─────────────────────────────────────────────────────

// Nodes connected in the full edge set (before connected-only filter)
const connectedNodeIds = computed(() => {
  if (!graphData.value) return new Set<string>()
  const ids = new Set<string>()
  for (const edge of Object.values(graphData.value.edges)) {
    ids.add(edge.source)
    ids.add(edge.target)
  }
  return ids
})

const filteredNodes = computed<Record<string, GraphNode>>(() => {
  if (!graphData.value) return {}
  const result: Record<string, GraphNode> = {}
  for (const [id, node] of Object.entries(graphData.value.nodes)) {
    if (selectedTypes.value.size > 0 && !selectedTypes.value.has(node.type)) continue
    if (connectedOnly.value && !connectedNodeIds.value.has(id)) continue
    result[id] = node
  }
  return result
})

const hiddenCount = computed(() => {
  if (!graphData.value || !connectedOnly.value) return 0
  const allCount = Object.values(graphData.value.nodes).filter(
    (n) => selectedTypes.value.size === 0 || selectedTypes.value.has(n.type),
  ).length
  return allCount - Object.keys(filteredNodes.value).length
})

const filteredEdges = computed<Record<string, GraphEdge>>(() => {
  if (!graphData.value) return {}
  const nodeIds = new Set(Object.keys(filteredNodes.value))
  const result: Record<string, GraphEdge> = {}
  for (const [id, edge] of Object.entries(graphData.value.edges)) {
    if (nodeIds.has(edge.source) && nodeIds.has(edge.target)) result[id] = edge
  }
  return result
})

const coloredEdges = computed<Record<string, GraphEdge>>(() => {
  const result: Record<string, GraphEdge> = {}
  for (const [id, edge] of Object.entries(filteredEdges.value)) {
    result[id] = { ...edge, color: relationTypeColor(edge.relationTypeSlug ?? 'custom') }
  }
  return result
})

// ─── Events ───────────────────────────────────────────────────────────────────

function onNodeClick(nodeId: string) {
  const node = graphData.value?.nodes[nodeId]
  if (node?.slug) navigateTo(`/campaigns/${campaignId}/entities/${node.slug}`)
}

// ─── Load ─────────────────────────────────────────────────────────────────────

async function load() {
  await withLoading(async () => {
    graphData.value = await api.getGraph()
    if (graphData.value) {
      // Restore persisted filter state, fall back to all selected
      try {
        const saved = localStorage.getItem(FILTER_KEY)
        if (saved) {
          const parsed = JSON.parse(saved) as string[]
          selectedTypes.value = new Set(parsed.filter((t) => entityTypes.value.includes(t)))
        }
        if (selectedTypes.value.size === 0) selectedTypes.value = new Set(entityTypes.value)
      } catch {
        selectedTypes.value = new Set(entityTypes.value)
      }
      try {
        cardLayout.value = localStorage.getItem(CARD_LAYOUT_KEY) === 'true'
      } catch {
        /* */
      }
      try {
        connectedOnly.value = localStorage.getItem(CONNECTED_KEY) === 'true'
      } catch {
        /* */
      }
    }
  })
}

onMounted(load)
</script>
