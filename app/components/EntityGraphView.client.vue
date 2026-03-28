<template>
  <div class="border border-border rounded-lg overflow-hidden relative" :style="{ height: height + 'px' }" data-testid="entity-graph-view">
    <ClientOnly>
      <div v-if="hasData" class="w-full h-full relative">
        <!-- Convex hull overlay: rendered as a positioned SVG behind the graph -->
        <svg
          v-if="hullPolygons.length"
          class="absolute inset-0 pointer-events-none"
          style="width: 100%; height: 100%; overflow: visible;"
        >
          <g :transform="`translate(${hullOrigin.x}, ${hullOrigin.y})`">
            <polygon
              v-for="hull in hullPolygons"
              :key="hull.orgSlug"
              :points="hull.points"
              :fill="hull.color"
              fill-opacity="0.15"
              stroke="none"
            />
          </g>
        </svg>

        <v-network-graph
          ref="graphRef"
          v-model:layouts="currentLayouts"
          :nodes="graphNodes"
          :edges="graphEdges"
          :configs="configs"
          :layout-handler="props.centerNodeId ? undefined : forceLayout"
          :event-handlers="eventHandlers"
        >
          <!-- Node override: portrait images + opacity for focus/context -->
          <template #override-node="{ nodeId, scale, config }">
            <g
              :style="{
                opacity: getNodeOpacity(nodeId),
                transition: 'opacity 300ms ease',
                willChange: 'opacity',
              }"
            >
              <template v-if="props.nodes[nodeId]?.image">
                <defs>
                  <clipPath :id="`clip-${nodeId}`">
                    <circle :r="nodeRadius(nodeId) * scale" cx="0" cy="0" />
                  </clipPath>
                </defs>
                <circle
                  :r="nodeRadius(nodeId) * scale"
                  cx="0"
                  cy="0"
                  fill="#e5e7eb"
                  stroke="#d1d5db"
                  stroke-width="1.5"
                />
                <image
                  :href="props.nodes[nodeId].image"
                  :x="-(nodeRadius(nodeId) * scale)"
                  :y="-(nodeRadius(nodeId) * scale)"
                  :width="nodeRadius(nodeId) * scale * 2"
                  :height="nodeRadius(nodeId) * scale * 2"
                  :clip-path="`url(#clip-${nodeId})`"
                  preserveAspectRatio="xMidYMid slice"
                />
              </template>
              <circle
                v-else
                :r="nodeRadius(nodeId) * scale"
                cx="0"
                cy="0"
                :fill="nodeTypeColor(nodeId)"
              />
            </g>
          </template>
        </v-network-graph>

        <!-- Hover tooltip -->
        <div
          v-if="tooltip.visible"
          class="absolute z-10 bg-popover border border-border rounded-lg shadow-lg p-3 pointer-events-none min-w-[140px] max-w-[200px]"
          :style="{ left: tooltip.x + 'px', top: tooltip.y + 'px', transform: 'translate(-50%, -110%)' }"
          data-testid="graph-tooltip"
        >
          <div class="flex items-center gap-2 mb-1">
            <img
              v-if="tooltip.image"
              :src="tooltip.image"
              class="w-8 h-8 rounded-full object-cover flex-shrink-0"
            />
            <div>
              <p class="font-semibold text-sm leading-tight">{{ tooltip.name }}</p>
              <span class="text-xs text-muted-foreground px-1 py-0.5 rounded bg-muted">{{ tooltip.type }}</span>
            </div>
          </div>
          <p class="text-xs text-muted-foreground mt-1">
            {{ tooltip.connections }} {{ $t('graph.tooltip.connections') }}
          </p>
        </div>
      </div>
      <div v-else class="flex items-center justify-center h-full text-muted-foreground">
        <p>No relationships to display.</p>
      </div>
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
import { VNetworkGraph, defineConfigs } from 'v-network-graph'
import 'v-network-graph/lib/style.css'
import { ForceLayout } from 'v-network-graph/lib/force-layout'
import {
  computeDegreeMap,
  computeNodeRadius,
  computeActiveHighlightSet,
  nodeOpacity,
  edgeLabelFontSize,
  createGraphSimulation,
  type SimNode,
  type SimLink,
} from '~/utils/graph-helpers'

const props = defineProps<{
  nodes: Record<string, { name: string; type: string; slug?: string; image?: string | null; organizations?: Array<{ slug: string; name: string }> }>
  edges: Record<string, { source: string; target: string; label: string; color: string; attitude?: number; relationTypeSlug?: string }>
  height?: number
  campaignId?: string
  centerNodeId?: string
}>()

const emit = defineEmits<{
  nodeClick: [nodeId: string]
}>()

const router = useRouter()

const graphRef = ref<InstanceType<typeof VNetworkGraph> | null>(null)

// ─── Live node positions (v-model:layouts) ───────────────────────────────────

const currentLayouts = ref<{ nodes: Record<string, { x: number; y: number }> }>({ nodes: {} })

// Seed radial positions for character detail page
watch(() => [props.centerNodeId, props.nodes] as const, () => {
  const nodeIds = Object.keys(props.nodes || {})
  if (!props.centerNodeId || nodeIds.length === 0) return
  const positions: Record<string, { x: number; y: number }> = {}
  positions[props.centerNodeId] = { x: 0, y: 0 }
  const others = nodeIds.filter(id => id !== props.centerNodeId)
  const radius = Math.max(160, others.length * 30)
  others.forEach((id, i) => {
    const angle = (2 * Math.PI * i) / others.length - Math.PI / 2
    positions[id] = { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius }
  })
  currentLayouts.value = { nodes: positions }
}, { immediate: true })

// ─── Convex Hulls ─────────────────────────────────────────────────────────────

const ORG_HULL_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#f97316']

// Compute the SVG translate origin: center of the container (v-network-graph centers at middle)
const hullOrigin = computed(() => ({ x: 0, y: 0 }))

const hullPolygons = computed(() => {
  const nodePositions = currentLayouts.value.nodes
  if (!nodePositions || Object.keys(nodePositions).length === 0) return []

  const orgPoints: Record<string, Array<[number, number]>> = {}
  const orgColors: Record<string, string> = {}
  const orgSlugsSeen: string[] = []

  for (const [nodeId, pos] of Object.entries(nodePositions)) {
    const orgs = props.nodes[nodeId]?.organizations ?? []
    for (const org of orgs) {
      if (!orgPoints[org.slug]) {
        orgPoints[org.slug] = []
        orgSlugsSeen.push(org.slug)
        orgColors[org.slug] = ORG_HULL_COLORS[orgSlugsSeen.length % ORG_HULL_COLORS.length]!
      }
      orgPoints[org.slug]!.push([pos.x, pos.y])
    }
  }

  const result: Array<{ orgSlug: string; points: string; color: string }> = []
  for (const [slug, pts] of Object.entries(orgPoints)) {
    if (pts.length < 3) continue
    const hull = convexHull(pts)
    if (!hull || hull.length < 3) continue
    const cx = hull.reduce((s, p) => s + p[0], 0) / hull.length
    const cy = hull.reduce((s, p) => s + p[1], 0) / hull.length
    const padded = hull.map(([x, y]): [number, number] => {
      const dx = x - cx
      const dy = y - cy
      const len = Math.sqrt(dx * dx + dy * dy) || 1
      return [x + (dx / len) * 20, y + (dy / len) * 20]
    })
    result.push({
      orgSlug: slug,
      points: padded.map(p => `${p[0]},${p[1]}`).join(' '),
      color: orgColors[slug]!,
    })
  }
  return result
})

function convexHull(points: Array<[number, number]>): Array<[number, number]> | null {
  if (points.length < 3) return null
  const n = points.length
  let start = 0
  for (let i = 1; i < n; i++) {
    if (points[i]![0]! < points[start]![0]!) start = i
  }
  const hull: Array<[number, number]> = []
  let cur = start
  do {
    hull.push(points[cur]!)
    let next = (cur + 1) % n
    for (let i = 0; i < n; i++) {
      const px = points[next]!
      const pc = points[cur]!
      const pi = points[i]!
      const cross = (px[0] - pc[0]) * (pi[1] - pc[1]) - (px[1] - pc[1]) * (pi[0] - pc[0])
      if (cross < 0) next = i
    }
    cur = next
  } while (cur !== start && hull.length <= n)
  return hull
}

// ─── Focus + Hover State ─────────────────────────────────────────────────────

const focusedNodeId = ref<string | null>(null)
const hoveredNodeId = ref<string | null>(null)

const activeHighlightSet = computed(() =>
  computeActiveHighlightSet(focusedNodeId.value ?? hoveredNodeId.value, props.edges ?? {}),
)

const activeMode = computed((): 'focus' | 'hover' | null => {
  if (focusedNodeId.value) return 'focus'
  if (hoveredNodeId.value) return 'hover'
  return null
})

function getNodeOpacity(nodeId: string): number {
  return nodeOpacity(nodeId, activeHighlightSet.value, activeMode.value)
}

// ─── Degree-based Node Sizing ────────────────────────────────────────────────

const degreeMap = computed(() => computeDegreeMap(props.edges ?? {}))

function nodeRadius(nodeId: string): number {
  return computeNodeRadius(degreeMap.value[nodeId] ?? 0)
}

// ─── Type Colors ─────────────────────────────────────────────────────────────

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

// ─── Graph Data ───────────────────────────────────────────────────────────────

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

// ─── Force Layout (campaign graph) ───────────────────────────────────────────

const forceLayout = new ForceLayout({
  positionFixedByDrag: true,
  createSimulation: (_d3: any, nodes: any[], edges: any[]) => {
    const simNodes: SimNode[] = nodes.map((n: any) => ({
      id: n.id,
      x: n.x,
      y: n.y,
      vx: n.vx,
      vy: n.vy,
      fx: n.fx,
      fy: n.fy,
      organizations: props.nodes[n.id]?.organizations ?? [],
    }))
    const simLinks: SimLink[] = edges.map((e: any) => ({
      id: e.id,
      source: e.source,
      target: e.target,
    }))
    const dm = computeDegreeMap(props.edges ?? {})
    return createGraphSimulation(simNodes, simLinks, dm) as any
  },
})

// ─── Tooltip ──────────────────────────────────────────────────────────────────

const tooltip = ref({
  visible: false,
  x: 0,
  y: 0,
  name: '',
  type: '',
  image: null as string | null,
  connections: 0,
})

let tooltipTimer: ReturnType<typeof setTimeout> | null = null

function showTooltip(nodeId: string, pos: { x: number; y: number }) {
  const node = props.nodes[nodeId]
  if (!node) return
  tooltip.value = {
    visible: true,
    x: pos.x,
    y: pos.y,
    name: node.name,
    type: node.type,
    image: node.image ?? null,
    connections: degreeMap.value[nodeId] ?? 0,
  }
}

function hideTooltip() {
  if (tooltipTimer) { clearTimeout(tooltipTimer); tooltipTimer = null }
  tooltip.value.visible = false
}

// ─── Double-click navigation with single-click debounce ──────────────────────

let clickTimer: ReturnType<typeof setTimeout> | null = null

function handleNodeClick(nodeId: string) {
  if (clickTimer) { clearTimeout(clickTimer); clickTimer = null; return }
  clickTimer = setTimeout(() => {
    clickTimer = null
    focusedNodeId.value = focusedNodeId.value === nodeId ? null : nodeId
    emit('nodeClick', nodeId)
  }, 250)
}

function handleNodeDblClick(nodeId: string) {
  if (clickTimer) { clearTimeout(clickTimer); clickTimer = null }
  const node = props.nodes[nodeId]
  if (!node || !props.campaignId) return
  const cid = props.campaignId
  const slug = node.slug ?? nodeId
  if (node.type === 'character') {
    router.push(`/campaigns/${cid}/characters/${slug}`)
  } else {
    router.push(`/campaigns/${cid}/entities/${slug}`)
  }
}

// ─── Configs ──────────────────────────────────────────────────────────────────

const configs = defineConfigs({
  view: {
    autoPanAndZoomOnLoad: 'fit-content',
    scalingObjects: true,
  },
  node: {
    normal: {
      radius: (node: any) => nodeRadius(node.id),
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
        if (!e) return '#9ca3af'
        if (activeMode.value && !activeHighlightSet.value.edgeIds.has(edge.id)) {
          return activeMode.value === 'focus' ? 'rgba(156,163,175,0.1)' : 'rgba(156,163,175,0.3)'
        }
        return e.color || '#9ca3af'
      },
      width: 2,
    },
    label: {
      fontSize: (edge: any) => edgeLabelFontSize(edge.id, activeHighlightSet.value, activeMode.value),
      color: '#6b7280',
    },
  },
})

// ─── Event Handlers ───────────────────────────────────────────────────────────

const eventHandlers = {
  'node:click': ({ node }: { node: string }) => handleNodeClick(node),
  'node:dblclick': ({ node }: { node: string }) => handleNodeDblClick(node),
  'node:pointerover': ({ node, event }: { node: string; event: PointerEvent }) => {
    if (focusedNodeId.value) return
    hoveredNodeId.value = node
    if (tooltipTimer) { clearTimeout(tooltipTimer); tooltipTimer = null }
    tooltipTimer = setTimeout(() => {
      const el = (graphRef.value as any)?.$el as HTMLElement | undefined
      if (!el) return
      const rect = el.getBoundingClientRect()
      const x = Math.max(70, Math.min(event.clientX - rect.left, rect.width - 70))
      const y = Math.max(60, Math.min(event.clientY - rect.top, rect.height - 10))
      showTooltip(node, { x, y })
    }, 200)
  },
  'node:pointerout': () => {
    hoveredNodeId.value = null
    hideTooltip()
  },
  'view:click': () => {
    focusedNodeId.value = null
  },
}
</script>
