<template>
  <div class="text-center py-12" data-testid="empty-state">
    <div class="text-4xl mb-3">{{ icon }}</div>
    <h3 class="text-lg font-medium text-foreground mb-1">{{ title }}</h3>
    <p class="text-sm text-muted-foreground mb-4">{{ description }}</p>
    <slot />
  </div>
</template>

<script setup lang="ts">
defineProps<{
  icon?: string
  title: string
  description?: string
}>()
</script>
