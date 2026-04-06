<template>
  <div class="mb-2">
    <div class="px-3 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
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
      <span class="text-sm flex-1 min-w-0 truncate">{{ entity.name }}</span>
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
  entities: any[]
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

function onDragStart(event: DragEvent, entity: any) {
  event.dataTransfer?.setData('application/aleph-entity', JSON.stringify(entity))
}
</script>
