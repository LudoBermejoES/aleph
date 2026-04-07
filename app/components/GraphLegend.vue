<template>
  <div v-if="entries.length" class="flex flex-wrap gap-3 mt-3" data-testid="graph-legend">
    <div
      v-for="entry in entries"
      :key="entry.slug"
      class="flex items-center gap-1.5 text-xs text-muted-foreground"
    >
      <!-- Line style sample -->
      <svg width="24" height="10" class="flex-shrink-0" aria-hidden="true">
        <line
          x1="2"
          y1="5"
          x2="22"
          y2="5"
          :stroke="entry.color"
          stroke-width="2"
          :stroke-dasharray="entry.dasharray || undefined"
        />
      </svg>
      <span>{{ entry.label }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { getEdgeStyle } from '~/utils/graph-helpers'

const props = defineProps<{
  edges: Record<string, { relationTypeSlug?: string; label?: string }>
}>()

const entries = computed(() => {
  const seen = new Map<string, string>()
  for (const edge of Object.values(props.edges)) {
    const slug = edge.relationTypeSlug ?? 'custom'
    if (!seen.has(slug)) {
      seen.set(slug, edge.label ?? slug)
    }
  }
  return Array.from(seen.entries()).map(([slug, label]) => {
    const style = getEdgeStyle(slug)
    return { slug, label, color: style.color, dasharray: style.dasharray }
  })
})
</script>
