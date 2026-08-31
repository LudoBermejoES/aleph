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
            :group-key="group.type"
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
interface ServerGroup {
  key: string
  label: string
  builtin: boolean
}

const results = ref<
  Record<
    string,
    { id: string; name: string; type: string; slug?: string; [key: string]: unknown }[]
  >
>({})
const serverGroups = ref<ServerGroup[]>([])

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
    const payload = await $fetch<Record<string, unknown>>(
      `/api/campaigns/${props.campaignId}/diagrams/entities${params}`,
    )
    // `groups` is metadata, not a group of entities — it must not reach `results`, or the panel
    // would try to render it as a list of entities.
    const { groups: g, ...rest } = payload
    serverGroups.value = Array.isArray(g) ? (g as ServerGroup[]) : []
    results.value = rest as typeof results.value
  } catch {
    results.value = {}
    serverGroups.value = []
  } finally {
    loading.value = false
  }
}

/**
 * Fallback group list for a server that predates `groups` in the response. It is the exact list
 * this component used to hold, kept only so an older deployment keeps rendering its four working
 * groups instead of an empty panel.
 */
const LEGACY_GROUPS: ServerGroup[] = [
  { key: 'characters', label: 'characters', builtin: true },
  { key: 'locations', label: 'locations', builtin: true },
  { key: 'organizations', label: 'organizations', builtin: true },
  { key: 'quests', label: 'quests', builtin: true },
  { key: 'wiki', label: 'wiki', builtin: true },
]

const groups = computed(() => {
  const defs = serverGroups.value.length > 0 ? serverGroups.value : LEGACY_GROUPS
  return defs
    .map((g) => ({
      type: g.key,
      // A built-in group's label is UI text and gets translated. A campaign type's label is the
      // DM's own `entity_types.name` and is shown verbatim — passing it through `t()` would print
      // a raw key like `diagrams.panel.item` at the reader.
      label: g.builtin ? t(`diagrams.panel.${g.key}`) : g.label,
      items: results.value[g.key] ?? [],
    }))
    .filter((g) => g.items.length > 0)
})

const isEmpty = computed(() => groups.value.length === 0)
</script>
