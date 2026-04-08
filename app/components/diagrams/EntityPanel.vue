<template>
  <div
    :class="[
      'flex flex-col border-r border-border bg-background transition-all duration-200 shrink-0',
      collapsed ? 'w-10' : 'w-72',
    ]"
  >
    <!-- Collapsed state: just toggle button -->
    <div v-if="collapsed" class="flex flex-col items-center pt-3">
      <button
        class="p-2 rounded hover:bg-accent transition-colors"
        :title="$t('diagrams.panel.expand')"
        data-testid="expand-panel-btn"
        @click="toggleCollapsed"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="w-4 h-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="m9 18 6-6-6-6" />
        </svg>
      </button>
    </div>

    <!-- Expanded state -->
    <template v-else>
      <div class="flex items-center justify-between px-3 py-2 border-b border-border">
        <span class="text-sm font-medium">{{ $t('diagrams.panel.title') }}</span>
        <button
          class="p-1 rounded hover:bg-accent transition-colors"
          :title="$t('diagrams.panel.collapse')"
          data-testid="collapse-panel-btn"
          @click="toggleCollapsed"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>
      </div>

      <div class="px-3 py-2 border-b border-border">
        <input
          v-model="searchQuery"
          type="text"
          :placeholder="$t('diagrams.panel.search')"
          class="w-full text-sm rounded-md border border-input bg-background px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-ring"
          data-testid="entity-search-input"
        />
      </div>

      <div class="flex-1 overflow-y-auto">
        <div v-if="loading" class="px-3 py-4 text-sm text-muted-foreground">
          {{ $t('common.loading') }}
        </div>

        <div v-else-if="isEmpty" class="px-3 py-4 text-sm text-muted-foreground">
          {{ searchQuery ? $t('diagrams.panel.noResults') : $t('diagrams.panel.empty') }}
        </div>

        <template v-else>
          <EntityGroup
            v-for="group in groups"
            :key="group.type"
            :label="group.label"
            :entities="group.items"
            :placed-entity-ids="placedEntityIds"
          />
        </template>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'

const props = defineProps<{
  campaignId: string
  placedEntityIds?: Map<string, number>
}>()

const { t } = useI18n()

const STORAGE_KEY = `aleph-entity-panel-collapsed-${props.campaignId}`

const collapsed = ref(false)
const searchQuery = ref('')
const loading = ref(false)
const results = ref<
  Record<
    string,
    { id: string; name: string; type: string; slug?: string; [key: string]: unknown }[]
  >
>({})

onMounted(() => {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === 'true') collapsed.value = true
  fetchEntities()
})

function toggleCollapsed() {
  collapsed.value = !collapsed.value
  localStorage.setItem(STORAGE_KEY, String(collapsed.value))
}

let debounceTimer: ReturnType<typeof setTimeout> | null = null

watch(searchQuery, () => {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(fetchEntities, 300)
})

async function fetchEntities() {
  loading.value = true
  try {
    const params = searchQuery.value ? `?q=${encodeURIComponent(searchQuery.value)}` : ''
    results.value = await $fetch(`/api/campaigns/${props.campaignId}/diagrams/entities${params}`)
  } catch {
    results.value = {}
  } finally {
    loading.value = false
  }
}

const groups = computed(() => {
  const defs = [
    { type: 'characters', label: t('diagrams.panel.characters') },
    { type: 'locations', label: t('diagrams.panel.locations') },
    { type: 'organizations', label: t('diagrams.panel.organizations') },
    { type: 'quests', label: t('diagrams.panel.quests') },
    { type: 'wiki', label: t('diagrams.panel.wiki') },
  ]
  return defs
    .map((d) => ({ ...d, items: results.value[d.type] ?? [] }))
    .filter((g) => g.items.length > 0)
})

const isEmpty = computed(() => groups.value.length === 0)
</script>
