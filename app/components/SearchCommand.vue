<template>
  <div>
    <!-- Trigger -->
    <button
      @click="open = true"
      class="flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground border border-border rounded-md hover:bg-accent transition-colors w-full"
    >
      <span>Search...</span>
      <kbd class="ml-auto text-xs bg-muted px-1.5 py-0.5 rounded">Ctrl+K</kbd>
    </button>

    <!-- Overlay -->
    <Teleport to="body">
      <div v-if="open" class="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]" @click.self="open = false">
        <div class="fixed inset-0 bg-black/50" @click="open = false" />
        <div class="relative bg-background border border-border rounded-lg shadow-xl w-full max-w-lg">
          <div class="flex items-center border-b border-border px-4">
            <svg class="w-4 h-4 text-muted-foreground shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
            <input
              ref="searchInput"
              v-model="query"
              @input="doSearch"
              @keydown.esc="open = false"
              placeholder="Search entities..."
              class="flex-1 px-3 py-3 bg-transparent text-sm outline-none"
            />
          </div>
          <div class="max-h-64 overflow-auto p-2">
            <div v-if="results.length" class="space-y-1">
              <NuxtLink
                v-for="result in results"
                :key="result.entityId"
                :to="`/campaigns/${campaignId}/entities/${result.entityId}`"
                @click="open = false"
                class="block px-3 py-2 rounded text-sm hover:bg-accent transition-colors"
              >
                <span class="font-medium">{{ result.name }}</span>
                <span v-html="result.snippet" class="block text-xs text-muted-foreground mt-0.5" />
              </NuxtLink>
            </div>
            <p v-else-if="query && !searching" class="px-3 py-4 text-sm text-muted-foreground text-center">No results.</p>
            <p v-else-if="!query" class="px-3 py-4 text-sm text-muted-foreground text-center">Start typing to search...</p>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ campaignId: string }>()

const open = ref(false)
const query = ref('')
const results = ref<any[]>([])
const searching = ref(false)
const searchInput = ref<HTMLInputElement>()

let debounceTimer: ReturnType<typeof setTimeout>

function doSearch() {
  clearTimeout(debounceTimer)
  if (!query.value.trim()) {
    results.value = []
    return
  }
  debounceTimer = setTimeout(async () => {
    searching.value = true
    try {
      const res = await $fetch(`/api/campaigns/${props.campaignId}/search`, {
        params: { q: query.value },
      }) as any
      results.value = res.results
    } catch {
      results.value = []
    } finally {
      searching.value = false
    }
  }, 200)
}

// Ctrl+K global shortcut
onMounted(() => {
  const handler = (e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault()
      open.value = !open.value
    }
  }
  window.addEventListener('keydown', handler)
  onUnmounted(() => window.removeEventListener('keydown', handler))
})

watch(open, (val) => {
  if (val) {
    query.value = ''
    results.value = []
    nextTick(() => searchInput.value?.focus())
  }
})
</script>
