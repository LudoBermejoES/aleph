<template>
  <div>
    <div
      class="flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-accent/30 transition-colors"
      :style="{ paddingLeft: `${depth * 24 + 12}px` }"
    >
      <!-- Expand/collapse toggle -->
      <button
        v-if="node.children.length > 0"
        class="w-5 h-5 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors shrink-0"
        @click="$emit('toggle', node.id)"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="w-3.5 h-3.5 transition-transform"
          :class="{ 'rotate-90': isExpanded }"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>
      <div v-else class="w-5 shrink-0"></div>

      <!-- Icon by subtype -->
      <span class="text-sm shrink-0">{{ subtypeIcon }}</span>

      <!-- Name link -->
      <NuxtLink
        :to="`/campaigns/${campaignId}/locations/${node.slug}`"
        class="font-medium hover:text-primary truncate flex-1 min-w-0"
      >
        {{ node.name }}
      </NuxtLink>

      <!-- Badges -->
      <span class="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground capitalize shrink-0">
        {{ node.subtype || 'other' }}
      </span>
      <span v-if="(node.childCount ?? 0) > 0" class="text-xs text-muted-foreground shrink-0">
        {{ node.childCount }} sub
      </span>
    </div>

    <!-- Children (collapsible) -->
    <div v-if="isExpanded && node.children.length > 0">
      <LocationTreeNode
        v-for="child in node.children"
        :key="child.id"
        :node="child"
        :campaign-id="campaignId"
        :depth="depth + 1"
        :expanded-ids="expandedIds"
        @toggle="$emit('toggle', $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
interface TreeNode {
  id: string
  name: string
  slug: string
  subtype?: string
  childCount?: number
  children: TreeNode[]
}

const props = defineProps<{
  node: TreeNode
  campaignId: string
  depth: number
  expandedIds: Set<string>
}>()

defineEmits<{
  toggle: [id: string]
}>()

const isExpanded = computed(() => props.expandedIds.has(props.node.id))

const subtypeIcon = computed(() => {
  const icons: Record<string, string> = {
    country: '🌍',
    region: '🏘️',
    city: '🏙️',
    town: '🏠',
    village: '🏚️',
    dungeon: '⚔️',
    lair: '🕳️',
    building: '🏛️',
    room: '🚪',
    wilderness: '🌲',
    other: '📍',
  }
  return icons[props.node.subtype ?? 'other'] ?? '📍'
})
</script>
