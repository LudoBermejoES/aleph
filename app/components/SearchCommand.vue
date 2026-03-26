<template>
  <div>
    <!-- Trigger -->
    <button
      @click="open = true"
      class="flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground border border-border rounded-md hover:bg-accent transition-colors w-full"
    >
      <span>{{ $t('search.placeholder') }}</span>
      <kbd class="ml-auto text-xs bg-muted px-1.5 py-0.5 rounded">{{ $t('search.shortcut') }}</kbd>
    </button>

    <!-- Overlay -->
    <Teleport to="body">
      <div v-if="open" class="fixed inset-0 z-50" @click.self="open = false">
        <div class="fixed inset-0 bg-black/50" @click="open = false" />
        <div class="fixed top-[20vh] left-1/2 -translate-x-1/2 z-[51] bg-background border border-border rounded-lg shadow-xl w-full max-w-lg">
          <div class="flex items-center border-b border-border px-4">
            <svg class="w-4 h-4 text-muted-foreground shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
            <input
              ref="searchInput"
              v-model="query"
              @input="doSearch"
              @keydown.esc="open = false"
              @keydown.arrow-down.prevent="moveSelection(1)"
              @keydown.arrow-up.prevent="moveSelection(-1)"
              @keydown.enter.prevent="selectCurrent"
              :placeholder="$t('search.placeholder')"
              class="flex-1 px-3 py-3 bg-transparent text-sm outline-none"
            />
          </div>
          <div class="max-h-64 overflow-auto p-2">
            <!-- Recent searches -->
            <div v-if="!query && recentSearches.length" class="mb-2">
              <p class="text-xs text-muted-foreground px-3 py-1">{{ $t('search.recent') }}</p>
              <button
                v-for="(recent, i) in recentSearches"
                :key="i"
                @click="query = recent; doSearch()"
                class="block w-full text-left px-3 py-1.5 rounded text-sm hover:bg-accent transition-colors text-muted-foreground"
              >{{ recent }}</button>
            </div>

            <div v-if="displayResults.length" class="space-y-1">
              <NuxtLink
                v-for="(result, i) in displayResults"
                :key="result.entityId"
                :ref="(el: any) => { if (el) resultEls[i] = el.$el || el }"
                :to="`/campaigns/${campaignId}/entities/${result.slug || result.entityId}`"
                @click="selectResult(result)"
                :class="['block px-3 py-2 rounded text-sm transition-colors', i === selectedIndex ? 'bg-accent' : 'hover:bg-accent/50']"
              >
                <span class="font-medium">{{ result.name }}</span>
                <span v-if="result.type" class="text-xs text-muted-foreground ml-2">{{ result.type }}</span>
                <span v-html="result.snippet" class="block text-xs text-muted-foreground mt-0.5" />
              </NuxtLink>
            </div>
            <p v-else-if="query && !searching" class="px-3 py-4 text-sm text-muted-foreground text-center">{{ $t('search.noResults') }}</p>
            <p v-else-if="!query && !recentSearches.length" class="px-3 py-4 text-sm text-muted-foreground text-center">{{ $t('search.startTyping') }}</p>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ campaignId: string }>()
const router = useRouter()

const open = ref(false)
const query = ref('')
const results = ref<any[]>([])
const searching = ref(false)
const searchInput = ref<HTMLInputElement>()
const selectedIndex = ref(-1)
const resultEls = ref<HTMLElement[]>([])

// Recent searches from localStorage
const RECENT_KEY = 'aleph:recent-searches'
const recentSearches = ref<string[]>([])

function loadRecent() {
  try {
    recentSearches.value = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]').slice(0, 5)
  } catch {
    recentSearches.value = []
  }
}

function saveRecent(q: string) {
  if (!q.trim()) return
  const existing = recentSearches.value.filter(r => r !== q)
  const updated = [q, ...existing].slice(0, 5)
  recentSearches.value = updated
  localStorage.setItem(RECENT_KEY, JSON.stringify(updated))
}

const displayResults = computed(() => results.value)

let debounceTimer: ReturnType<typeof setTimeout>

function doSearch() {
  clearTimeout(debounceTimer)
  selectedIndex.value = -1
  if (!query.value.trim()) {
    results.value = []
    return
  }
  debounceTimer = setTimeout(async () => {
    searching.value = true
    try {
      const res = await useCampaignApi(props.campaignId).search({ q: query.value })
      results.value = res.results
    } catch {
      results.value = []
    } finally {
      searching.value = false
    }
  }, 200)
}

// Arrow key navigation
function moveSelection(delta: number) {
  const len = displayResults.value.length
  if (!len) return
  selectedIndex.value = (selectedIndex.value + delta + len) % len
  // Scroll into view
  nextTick(() => {
    resultEls.value[selectedIndex.value]?.scrollIntoView?.({ block: 'nearest' })
  })
}

function selectCurrent() {
  const item = displayResults.value[selectedIndex.value]
  if (item) {
    selectResult(item)
    const slug = item.slug || item.entityId
    router.push(`/campaigns/${props.campaignId}/entities/${slug}`)
  }
}

function selectResult(result: any) {
  saveRecent(query.value)
  open.value = false
}

// Ctrl+K global shortcut
onMounted(() => {
  loadRecent()
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
    selectedIndex.value = -1
    resultEls.value = []
    loadRecent()
    nextTick(() => searchInput.value?.focus())
  }
})
</script>
