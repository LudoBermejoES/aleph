<template>
  <div class="space-y-3 animate-pulse" data-testid="loading-skeleton">
    <div
      v-for="i in rows"
      :key="i"
      class="flex items-center gap-4 p-4 rounded-lg border border-border"
    >
      <div class="h-4 bg-muted rounded w-1/3"></div>
      <div class="h-3 bg-muted rounded w-1/5"></div>
      <div class="flex-1"></div>
      <div class="h-3 bg-muted rounded w-16"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{ rows?: number }>()
</script>
