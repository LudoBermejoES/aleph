<template>
  <div class="mb-2">
    <div
      :data-testid="`entity-group-${groupKey ?? label}`"
      class="px-3 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider"
    >
      {{ label }}
    </div>
    <div
      v-for="entity in entities"
      :key="entity.id"
      class="flex items-center gap-2 px-3 py-2 hover:bg-accent cursor-grab active:cursor-grabbing transition-colors"
      draggable="true"
      :data-testid="`entity-card-${entity.id}`"
      @dragstart="onDragStart($event, entity)"
    >
      <div
        class="w-8 h-8 rounded shrink-0 overflow-hidden bg-muted flex items-center justify-center"
      >
        <img
          v-if="entity.portraitUrl"
          :src="entity.portraitUrl"
          :alt="entity.name"
          class="w-full h-full object-cover"
        />
        <span v-else class="text-sm">{{ typeIcon(entity.entityType) }}</span>
      </div>
      <!-- An entity name is the card's primary content, so it carries `text-foreground`
           explicitly rather than inheriting: brighter than the group heading's
           `text-muted-foreground` above, which is metadata. -->
      <span class="text-sm text-foreground flex-1 min-w-0 truncate">{{ entity.name }}</span>
      <span
        v-if="badgeCount(entity.id) > 0"
        class="text-xs bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center shrink-0"
        :data-testid="`entity-badge-${entity.id}`"
      >
        {{ badgeCount(entity.id) }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  label: string
  /**
   * The group's stable machine key (`item`, `lore`, `characters`…), used for the test hook. The
   * LABEL cannot serve as one: it is translated for built-in groups and is the DM's own editable
   * `entity_types.name` for the rest, so a selector built on it breaks on a language switch or a
   * rename.
   */
  groupKey?: string
  entities: { id: string; name: string; type: string; slug?: string; [key: string]: unknown }[]
  placedEntityIds?: Map<string, number>
}>()

function typeIcon(type: string): string {
  const icons: Record<string, string> = {
    character: '🧑',
    location: '📍',
    organization: '🏛️',
    quest: '⚔️',
    wiki: '📖',
    entity: '📋',
  }
  return icons[type] ?? '📋'
}

function badgeCount(id: string): number {
  return props.placedEntityIds?.get(id) ?? 0
}

function onDragStart(
  event: DragEvent,
  entity: { id: string; name: string; type: string; slug?: string; [key: string]: unknown },
) {
  event.dataTransfer?.setData('application/aleph-entity', JSON.stringify(entity))
}
</script>
