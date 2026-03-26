<template>
  <div class="prose dark:prose-invert max-w-none text-foreground">
    <div v-if="loading" class="animate-pulse space-y-2">
      <div class="h-4 bg-muted rounded w-3/4"></div>
      <div class="h-4 bg-muted rounded w-1/2"></div>
      <div class="h-4 bg-muted rounded w-5/6"></div>
    </div>
    <MDC v-else-if="content" :value="content" />
    <p v-else class="text-muted-foreground italic">No content.</p>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  content?: string
  loading?: boolean
}>()
</script>
