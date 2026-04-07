<template>
  <div
    v-if="nodeCount >= 30"
    class="absolute bottom-3 right-3 z-10 bg-background border border-border rounded-lg shadow-md overflow-hidden"
    style="width: 160px"
    data-testid="graph-mini-map"
  >
    <!-- Header -->
    <div
      class="flex items-center justify-between px-2 py-1 border-b border-border cursor-pointer select-none"
      @click="toggle"
    >
      <span class="text-xs text-muted-foreground">{{ $t('graph.miniMap') }}</span>
      <component
        :is="collapsed ? ICONS.chevronUp : ICONS.chevronDown"
        class="w-3 h-3 text-muted-foreground"
      />
    </div>

    <!-- SVG canvas -->
    <svg
      v-if="!collapsed"
      ref="svgEl"
      :width="WIDTH"
      :height="HEIGHT"
      style="display: block; cursor: crosshair"
      @click.stop="onMapClick"
    >
      <!-- Edges (thin, no color) -->
      <line
        v-for="(edge, id) in edges"
        :key="id"
        :x1="toMx(nodePositions[edge.source]?.x)"
        :y1="toMy(nodePositions[edge.source]?.y)"
        :x2="toMx(nodePositions[edge.target]?.x)"
        :y2="toMy(nodePositions[edge.target]?.y)"
        stroke="#d1d5db"
        stroke-width="0.5"
      />
      <!-- Nodes -->
      <circle
        v-for="(pos, id) in visibleNodePositions"
        :key="id"
        :cx="toMx(pos.x)"
        :cy="toMy(pos.y)"
        r="2.5"
        :fill="nodeColor(id)"
      />
      <!-- Viewport rectangle -->
      <rect
        v-if="viewport.w > 0"
        :x="viewport.x"
        :y="viewport.y"
        :width="viewport.w"
        :height="viewport.h"
        fill="none"
        stroke="#6b7280"
        stroke-width="1"
        rx="1"
      />
    </svg>
  </div>
</template>

<script setup lang="ts">
import { ICONS } from '~/utils/icons'

const props = defineProps<{
  nodePositions: Record<string, { x: number; y: number }>
  nodes: Record<string, { name: string; type: string }>
  edges: Record<string, { source: string; target: string }>
  graphRef: {
    getViewBox: () => { top: number; bottom: number; left: number; right: number }
    panTo: (p: { x: number; y: number }) => void
  } | null
  campaignId: string
}>()

const COLLAPSE_KEY = computed(() => `aleph:graph:minimap:collapsed:${props.campaignId}`)
const WIDTH = 160
const HEIGHT = 100
const PADDING = 8

const collapsed = ref(false)
onMounted(() => {
  try {
    collapsed.value = localStorage.getItem(COLLAPSE_KEY.value) === 'true'
  } catch {
    /* */
  }
  scheduleUpdate()
})

function toggle() {
  collapsed.value = !collapsed.value
  try {
    localStorage.setItem(COLLAPSE_KEY.value, String(collapsed.value))
  } catch {
    /* */
  }
}

// ─── Bounds computation ──────────────────────────────────────────────────────

const nodeCount = computed(() => Object.keys(props.nodePositions).length)

const visibleNodePositions = computed(() => props.nodePositions)

const bounds = computed(() => {
  const positions = Object.values(props.nodePositions)
  if (positions.length === 0) return { minX: 0, maxX: 1, minY: 0, maxY: 1 }
  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity
  for (const { x, y } of positions) {
    if (x < minX) minX = x
    if (x > maxX) maxX = x
    if (y < minY) minY = y
    if (y > maxY) maxY = y
  }
  const pad = Math.max((maxX - minX) * 0.1, 20)
  return { minX: minX - pad, maxX: maxX + pad, minY: minY - pad, maxY: maxY + pad }
})

function toMx(wx: number | undefined): number {
  if (wx === undefined) return 0
  const { minX, maxX } = bounds.value
  return PADDING + ((wx - minX) / (maxX - minX)) * (WIDTH - PADDING * 2)
}

function toMy(wy: number | undefined): number {
  if (wy === undefined) return 0
  const { minY, maxY } = bounds.value
  return PADDING + ((wy - minY) / (maxY - minY)) * (HEIGHT - PADDING * 2)
}

function toWorldX(mx: number): number {
  const { minX, maxX } = bounds.value
  return minX + ((mx - PADDING) / (WIDTH - PADDING * 2)) * (maxX - minX)
}

function toWorldY(my: number): number {
  const { minY, maxY } = bounds.value
  return minY + ((my - PADDING) / (HEIGHT - PADDING * 2)) * (maxY - minY)
}

// ─── Node colors ─────────────────────────────────────────────────────────────

const TYPE_COLORS: Record<string, string> = {
  character: '#3b82f6',
  location: '#10b981',
  organization: '#f59e0b',
  item: '#8b5cf6',
  event: '#ef4444',
}

function nodeColor(id: string): string {
  const type = props.nodes[id]?.type?.toLowerCase() ?? ''
  return TYPE_COLORS[type] ?? '#6b7280'
}

// ─── Viewport rectangle ───────────────────────────────────────────────────────

const viewport = ref({ x: 0, y: 0, w: 0, h: 0 })
let rafId: number | null = null

function scheduleUpdate() {
  if (rafId !== null) return
  rafId = requestAnimationFrame(() => {
    rafId = null
    updateViewport()
  })
}

function updateViewport() {
  const g = props.graphRef
  if (!g) return
  try {
    const box = g.getViewBox()
    // box is in world coordinates; convert to mini-map pixels
    const x1 = toMx(box.left)
    const y1 = toMy(box.top)
    const x2 = toMx(box.right)
    const y2 = toMy(box.bottom)
    viewport.value = { x: x1, y: y1, w: Math.max(2, x2 - x1), h: Math.max(2, y2 - y1) }
  } catch {
    /* */
  }
}

watch(
  () => props.nodePositions,
  () => scheduleUpdate(),
  { deep: false },
)
watch(
  () => props.graphRef,
  () => scheduleUpdate(),
)

// ─── Click to pan ─────────────────────────────────────────────────────────────

function onMapClick(event: MouseEvent) {
  const svgEl = event.currentTarget as SVGSVGElement
  const rect = svgEl.getBoundingClientRect()
  const mx = event.clientX - rect.left
  const my = event.clientY - rect.top
  const wx = toWorldX(mx)
  const wy = toWorldY(my)
  props.graphRef?.panTo({ x: wx, y: wy })
}

onBeforeUnmount(() => {
  if (rafId !== null) cancelAnimationFrame(rafId)
})
</script>
