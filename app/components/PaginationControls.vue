<template>
  <div v-if="totalPages > 1" class="flex items-center justify-between mt-4 text-sm">
    <span class="text-muted-foreground">
      {{ $t('pagination.showing', { from: from, to: to, total }) }}
    </span>
    <div class="flex items-center gap-1">
      <button
        :disabled="page <= 1"
        class="px-2 py-1 rounded border border-border disabled:opacity-40 hover:bg-muted transition-colors"
        @click="$emit('change', page - 1)"
      >‹</button>
      <button
        v-for="p in visiblePages"
        :key="p"
        :class="['px-3 py-1 rounded border transition-colors', p === page ? 'border-primary bg-primary text-primary-foreground' : 'border-border hover:bg-muted']"
        @click="$emit('change', p)"
      >{{ p }}</button>
      <button
        :disabled="page >= totalPages"
        class="px-2 py-1 rounded border border-border disabled:opacity-40 hover:bg-muted transition-colors"
        @click="$emit('change', page + 1)"
      >›</button>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  page: number
  pageSize: number
  total: number
  totalPages: number
}>()

defineEmits<{ change: [page: number] }>()

const from = computed(() => Math.min(props.total, (props.page - 1) * props.pageSize + 1))
const to = computed(() => Math.min(props.total, props.page * props.pageSize))

const visiblePages = computed(() => {
  const pages: number[] = []
  const start = Math.max(1, props.page - 2)
  const end = Math.min(props.totalPages, props.page + 2)
  for (let i = start; i <= end; i++) pages.push(i)
  return pages
})
</script>
