<script setup lang="ts">
const props = defineProps<{
  status: string
}>()

const statusConfig = computed(() => {
  switch (props.status) {
    case 'synced-remote':
      return {
        label: 'diagrams.multiplayer.connected',
        class: 'text-green-600',
        dot: 'bg-green-500',
      }
    case 'loading':
      return {
        label: 'diagrams.multiplayer.reconnecting',
        class: 'text-yellow-600',
        dot: 'bg-yellow-500',
      }
    case 'error':
      return {
        label: 'diagrams.multiplayer.disconnected',
        class: 'text-destructive',
        dot: 'bg-destructive',
      }
    default:
      return {
        label: 'diagrams.multiplayer.connecting',
        class: 'text-muted-foreground',
        dot: 'bg-muted-foreground',
      }
  }
})
</script>

<template>
  <div class="flex items-center gap-1.5 text-xs" :class="statusConfig.class">
    <span class="w-2 h-2 rounded-full" :class="statusConfig.dot"></span>
    <span>{{ $t(statusConfig.label) }}</span>
  </div>
</template>
