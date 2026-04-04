<template>
  <div class="p-8">
    <div class="flex items-center gap-2 text-sm text-muted-foreground mb-1">
      <NuxtLink :to="`/campaigns/${campaignId}`" class="hover:text-primary"> {{ $t('common.campaign') }}</NuxtLink>
      <span>/</span>
      <span>{{ $t('characters.title') }}</span>
    </div>

    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold">{{ $t('characters.title') }}</h1>
      <div class="flex gap-2">
        <NuxtLink :to="`/campaigns/${campaignId}/entities`">
          <Button variant="outline" size="sm">{{ $t('characters.allEntities') }}</Button>
        </NuxtLink>
        <NuxtLink :to="`/campaigns/${campaignId}/characters/new`">
          <Button data-testid="new-character-btn">{{ $t('characters.new') }}</Button>
        </NuxtLink>
      </div>
    </div>

    <CharacterFilterBar
      :type-filter="typeFilter"
      :search-input="searchInput"
      :status-filter="statusFilter"
      :race-filter="raceFilter"
      :class-filter="classFilter"
      :alignment-filter="alignmentFilter"
      :org-filter="orgFilter"
      :location-filter="locationFilter"
      :show-companions="showCompanions"
      :sort-field="sortField"
      :sort-dir="sortDir"
      :races="meta.races"
      :classes="meta.classes"
      :organizations="organizations"
      :location-options="locationOptions"
      @set-type="(t) => setType(t, load)"
      @update:search-input="(v) => { filters.searchInput.value = v }"
      @update:status-filter="(v) => { filters.statusFilter.value = v }"
      @update:race-filter="(v) => { filters.raceFilter.value = v }"
      @update:class-filter="(v) => { filters.classFilter.value = v }"
      @update:alignment-filter="(v) => { filters.alignmentFilter.value = v }"
      @update:org-filter="(v) => { filters.orgFilter.value = v }"
      @update:location-filter="(v) => { filters.locationFilter.value = v }"
      @update:show-companions="(v) => { filters.showCompanions.value = v }"
      @update:sort-field="(v) => { filters.sortField.value = v }"
      @toggle-sort-dir="toggleSortDir(load)"
      @filter-change="onFilterChange(load)"
    />

    <div class="flex gap-6">
      <CharacterFolderSidebar
        :folders="folders"
        :selected-folder="selectedFolder"
        :visible="typeFilter === 'npc'"
        @select-folder="(id) => { filters.selectedFolder.value = id; onFilterChange(load) }"
      />

      <div class="flex-1">
        <LoadingSkeleton v-if="loading" :rows="4" />
        <div v-else-if="chars.length" class="space-y-2">
          <CharacterListItem
            v-for="c in chars"
            :key="c.id"
            :character="c"
            :campaign-id="campaignId"
          />
        </div>
        <EmptyState v-else icon="🧙" :title="$t('characters.empty')" :description="$t('characters.emptyDescription')">
          <NuxtLink :to="`/campaigns/${campaignId}/characters/new`"><Button size="sm">{{ $t('characters.new') }}</Button></NuxtLink>
        </EmptyState>
      </div>
    </div>
    <ErrorToast v-if="error" :message="error" @dismiss="dismissError" />
  </div>
</template>

<script setup lang="ts">
import type { Character, CharacterFolder, CharacterMeta } from '~/types/api'

const route = useRoute()
const campaignId = route.params.id as string

const chars = ref<Character[]>([])
const folders = ref<CharacterFolder[]>([])
const meta = ref<CharacterMeta>({ races: [], classes: [], alignments: [] })
const organizations = ref<any[]>([])

const filters = useCharacterFilters(campaignId)
const {
  typeFilter, selectedFolder, searchInput, statusFilter, raceFilter,
  classFilter, alignmentFilter, orgFilter, locationFilter, showCompanions,
  sortField, sortDir, initFromUrl, buildParams, onFilterChange, setType, toggleSortDir,
} = filters

const locationOptions = computed(() => {
  const seen = new Set<string>()
  const result: { id: string; name: string }[] = []
  for (const c of chars.value) {
    if (c.locationEntityId && c.locationName && !seen.has(c.locationEntityId)) {
      seen.add(c.locationEntityId)
      result.push({ id: c.locationEntityId, name: c.locationName })
    }
  }
  return result
})

const { loading, error, withLoading, dismissError } = useLoadingState()
const api = useCampaignApi(campaignId)

let searchTimer: ReturnType<typeof setTimeout>
watch(searchInput, () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => onFilterChange(load), 300)
})

async function load() {
  await withLoading(async () => {
    chars.value = await api.getCharacters(buildParams())
  })
}

onMounted(async () => {
  initFromUrl()
  await Promise.all([
    load(),
    api.getCharacterFolders().then(f => { folders.value = f }).catch(() => {}),
    api.getCharactersMeta().then(m => { meta.value = m }).catch(() => {}),
    api.getOrganizations().then(o => { organizations.value = o }).catch(() => {}),
  ])
})
</script>
