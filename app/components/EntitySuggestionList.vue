<template>
  <div v-if="items.length" class="bg-popover border border-border rounded-lg shadow-lg overflow-hidden max-h-48 overflow-y-auto" data-testid="entity-suggestions">
    <button
      v-for="(item, index) in items"
      :key="item.id"
      :class="['block w-full text-left px-3 py-2 text-sm', index === selectedIndex ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50']"
      @click="selectItem(index)"
    >
      <span class="font-medium">{{ item.name }}</span>
      <span class="text-xs text-muted-foreground ml-2">{{ item.type }}</span>
    </button>
  </div>
  <div v-else-if="query.length >= 1" class="bg-popover border border-border rounded-lg shadow-lg px-3 py-2 text-sm text-muted-foreground" data-testid="entity-suggestions-empty">
    No entities found
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  items: Array<{ id: string; name: string; slug: string; type: string }>
  command: (item: any) => void
  query: string
}>()

const selectedIndex = ref(0)

watch(() => props.items, () => {
  selectedIndex.value = 0
})

function selectItem(index: number) {
  const item = props.items[index]
  if (item) props.command(item)
}

function onKeyDown(event: KeyboardEvent): boolean {
  if (event.key === 'ArrowUp') {
    selectedIndex.value = (selectedIndex.value + props.items.length - 1) % props.items.length
    return true
  }
  if (event.key === 'ArrowDown') {
    selectedIndex.value = (selectedIndex.value + 1) % props.items.length
    return true
  }
  if (event.key === 'Enter') {
    selectItem(selectedIndex.value)
    return true
  }
  return false
}

defineExpose({ onKeyDown })
</script>
