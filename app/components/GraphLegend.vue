<template>
  <div v-if="entries.length" class="flex flex-wrap gap-3 mt-3" data-testid="graph-legend">
    <div
      v-for="entry in entries"
      :key="entry.slug"
      class="flex items-center gap-1.5 text-xs text-muted-foreground"
    >
      <span
        class="w-3 h-3 rounded-full flex-shrink-0"
        :style="{ backgroundColor: entry.color }"
      />
      <span>{{ entry.label }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { relationTypeColor } from '~/utils/graph-helpers'

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
  return Array.from(seen.entries()).map(([slug, label]) => ({
    slug,
    label,
    color: relationTypeColor(slug),
  }))
})
</script>
