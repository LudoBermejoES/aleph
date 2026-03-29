<template>
  <div class="p-8">
    <div class="flex items-center gap-2 text-sm text-muted-foreground mb-1">
      <NuxtLink :to="`/campaigns/${campaignId}`" class="hover:text-primary">Campaign</NuxtLink>
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

    <!-- PC/NPC Toggle + Search -->
    <div class="flex flex-wrap items-center gap-2 mb-4">
      <Button :variant="typeFilter === 'all' ? 'default' : 'outline'" size="sm" @click="setType('all')">{{ $t('characters.all') }}</Button>
      <Button :variant="typeFilter === 'pc' ? 'default' : 'outline'" size="sm" @click="setType('pc')">{{ $t('characters.pcs') }}</Button>
      <Button :variant="typeFilter === 'npc' ? 'default' : 'outline'" size="sm" @click="setType('npc')">{{ $t('characters.npcs') }}</Button>

      <div class="relative ml-auto">
        <component :is="ICONS.search" class="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <input
          v-model="searchInput"
          type="text"
          :placeholder="$t('characters.searchPlaceholder')"
          class="pl-8 pr-3 py-1.5 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary w-56"
          data-testid="character-search"
        />
      </div>
    </div>

    <!-- Filter Bar -->
    <div class="flex flex-wrap items-center gap-2 mb-4" data-testid="filter-bar">
      <!-- Status filter -->
      <select v-model="statusFilter" class="text-sm border border-border rounded-md px-2 py-1.5 bg-background" data-testid="status-filter" @change="onFilterChange">
        <option value="">{{ $t('characters.statusAll') }}</option>
        <option value="alive">{{ $t('characters.alive') }}</option>
        <option value="dead">{{ $t('characters.dead') }}</option>
        <option value="missing">{{ $t('characters.missing') }}</option>
        <option value="unknown">{{ $t('characters.unknown') }}</option>
      </select>

      <!-- Race filter -->
      <select v-if="meta.races.length" v-model="raceFilter" class="text-sm border border-border rounded-md px-2 py-1.5 bg-background" data-testid="race-filter" @change="onFilterChange">
        <option value="">{{ $t('characters.allRaces') }}</option>
        <option v-for="r in meta.races" :key="r" :value="r">{{ r }}</option>
      </select>

      <!-- Class filter -->
      <select v-if="meta.classes.length" v-model="classFilter" class="text-sm border border-border rounded-md px-2 py-1.5 bg-background" data-testid="class-filter" @change="onFilterChange">
        <option value="">{{ $t('characters.allClasses') }}</option>
        <option v-for="c in meta.classes" :key="c" :value="c">{{ c }}</option>
      </select>

      <!-- Alignment filter -->
      <select v-model="alignmentFilter" class="text-sm border border-border rounded-md px-2 py-1.5 bg-background" data-testid="alignment-filter" @change="onFilterChange">
        <option value="">{{ $t('characters.allAlignments') }}</option>
        <option v-for="a in ALIGNMENTS" :key="a" :value="a">{{ a }}</option>
      </select>

      <!-- Organization filter -->
      <select v-if="organizations.length" v-model="orgFilter" class="text-sm border border-border rounded-md px-2 py-1.5 bg-background" data-testid="org-filter" @change="onFilterChange">
        <option value="">{{ $t('characters.allOrgs') }}</option>
        <option v-for="o in organizations" :key="o.id" :value="o.id">{{ o.name }}</option>
      </select>

      <!-- Location filter -->
      <select v-if="locationOptions.length" v-model="locationFilter" class="text-sm border border-border rounded-md px-2 py-1.5 bg-background" data-testid="location-filter" @change="onFilterChange">
        <option value="">{{ $t('characters.allLocations') }}</option>
        <option v-for="l in locationOptions" :key="l.id" :value="l.id">{{ l.name }}</option>
      </select>

      <!-- Companions toggle -->
      <label class="flex items-center gap-1.5 text-sm cursor-pointer">
        <input v-model="showCompanions" type="checkbox" class="rounded" data-testid="companions-toggle" @change="onFilterChange" />
        {{ $t('characters.showCompanions') }}
      </label>
    </div>

    <!-- Sort Controls -->
    <div class="flex items-center gap-2 mb-6" data-testid="sort-controls">
      <span class="text-sm text-muted-foreground">{{ $t('characters.sortBy') }}</span>
      <select v-model="sortField" class="text-sm border border-border rounded-md px-2 py-1.5 bg-background" data-testid="sort-field" @change="onFilterChange">
        <option value="updatedAt">{{ $t('characters.sortUpdatedAt') }}</option>
        <option value="name">{{ $t('characters.sortName') }}</option>
        <option value="status">{{ $t('characters.sortStatus') }}</option>
        <option value="race">{{ $t('characters.sortRace') }}</option>
        <option value="class">{{ $t('characters.sortClass') }}</option>
      </select>
      <Button variant="outline" size="sm" data-testid="sort-dir" @click="toggleSortDir">
        {{ sortDir === 'asc' ? $t('characters.sortAsc') : $t('characters.sortDesc') }}
      </Button>
    </div>

    <div class="flex gap-6">
      <!-- NPC Folder Sidebar -->
      <aside v-if="typeFilter === 'npc' && folders.length" class="w-48 shrink-0" data-testid="folder-sidebar">
        <h3 class="text-sm font-semibold mb-2">{{ $t('characters.folders') }}</h3>
        <button
          class="block w-full text-left text-sm px-2 py-1 rounded mb-1 hover:bg-secondary"
          :class="{ 'bg-secondary font-medium': !selectedFolder }"
          @click="selectedFolder = ''; onFilterChange()"
        >{{ $t('characters.allNpcs') }}</button>
        <button
          v-for="f in folders"
          :key="f.id"
          class="block w-full text-left text-sm px-2 py-1 rounded mb-1 hover:bg-secondary"
          :class="{ 'bg-secondary font-medium': selectedFolder === f.id }"
          @click="selectedFolder = f.id; onFilterChange()"
        >{{ f.name }}</button>
      </aside>

      <!-- Character List -->
      <div class="flex-1">
        <LoadingSkeleton v-if="loading" :rows="4" />
        <div v-else-if="chars.length" class="space-y-2">
          <NuxtLink
            v-for="c in chars"
            :key="c.id"
            :to="`/campaigns/${campaignId}/characters/${c.slug}`"
            class="block p-4 rounded-lg border border-border hover:border-primary/50 transition-colors"
          >
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <CharacterPortrait :portrait-url="c.portraitUrl ?? null" :name="c.name" :editable="false" size="sm" />
                <div>
                  <span class="font-medium">{{ c.name }}</span>
                  <span class="inline-flex items-center gap-1 text-xs ml-2 px-2 py-0.5 rounded bg-secondary text-secondary-foreground">
                    <component :is="c.characterType === 'pc' ? ICONS.pc : ICONS.npc" class="w-3 h-3" />{{ c.characterType }}
                  </span>
                  <span v-if="c.race" class="text-xs ml-1 text-muted-foreground">{{ c.race }}</span>
                  <span v-if="c.class" class="text-xs ml-1 text-muted-foreground">{{ c.class }}</span>
                  <span v-if="c.alignment" class="text-xs ml-1 text-muted-foreground italic">{{ c.alignment }}</span>
                  <span v-if="c.isCompanionOf" class="text-xs ml-1 text-muted-foreground italic">{{ $t('characters.companion') }}</span>
                  <!-- Location indicator -->
                  <span v-if="c.locationName" class="inline-flex items-center gap-0.5 text-xs ml-2 text-muted-foreground" data-testid="location-indicator">
                    <component :is="ICONS.locations" class="w-3 h-3" />{{ c.locationName }}
                  </span>
                  <!-- Primary org badge -->
                  <span v-if="c.primaryOrg" class="inline-flex items-center gap-1 text-xs ml-2 px-2 py-0.5 rounded bg-secondary text-secondary-foreground" data-testid="org-badge">
                    <component :is="ICONS.organizations" class="w-3 h-3" />{{ c.primaryOrg.name }}
                  </span>
                </div>
              </div>
              <!-- Status badge -->
              <span
                :class="[
                  'inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded',
                  c.status === 'alive' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' :
                  c.status === 'dead' ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' :
                  c.status === 'missing' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300' :
                  'bg-secondary text-secondary-foreground'
                ]"
                data-testid="status-badge"
              >
                <component :is="ICONS[c.status as 'alive' | 'dead' | 'missing' | 'unknown'] ?? ICONS.unknown" class="w-3 h-3" />
                {{ c.status }}
              </span>
            </div>
          </NuxtLink>
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
import { ICONS } from '~/utils/icons'
import type { Character, CharacterFolder, CharacterMeta } from '~/types/api'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const campaignId = route.params.id as string

const ALIGNMENTS = [
  'Lawful Good', 'Neutral Good', 'Chaotic Good',
  'Lawful Neutral', 'True Neutral', 'Chaotic Neutral',
  'Lawful Evil', 'Neutral Evil', 'Chaotic Evil',
]

const chars = ref<Character[]>([])
const folders = ref<CharacterFolder[]>([])
const meta = ref<CharacterMeta>({ races: [], classes: [], alignments: [] })
const organizations = ref<any[]>([])

// All filter/sort state — initialized from URL on mount
const typeFilter = ref('all')
const selectedFolder = ref('')
const searchInput = ref('')
const statusFilter = ref('')
const raceFilter = ref('')
const classFilter = ref('')
const alignmentFilter = ref('')
const orgFilter = ref('')
const locationFilter = ref('')
const showCompanions = ref(true)
const sortField = ref('updatedAt')
const sortDir = ref('desc')

// Derived: unique location options from loaded chars
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

// Debounce search
let searchTimer: ReturnType<typeof setTimeout>
watch(searchInput, () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => { onFilterChange() }, 300)
})

async function load() {
  await withLoading(async () => {
    const params: Record<string, string> = {}
    if (typeFilter.value !== 'all') params.type = typeFilter.value
    if (selectedFolder.value) params.folderId = selectedFolder.value
    if (searchInput.value) params.search = searchInput.value
    if (statusFilter.value) params.status = statusFilter.value
    if (raceFilter.value) params.race = raceFilter.value
    if (classFilter.value) params.class = classFilter.value
    if (alignmentFilter.value) params.alignment = alignmentFilter.value
    if (orgFilter.value) params.organizationId = orgFilter.value
    if (locationFilter.value) params.locationEntityId = locationFilter.value
    if (!showCompanions.value) params.companions = 'false'
    params.sort = sortField.value
    params.sortDir = sortDir.value
    chars.value = await api.getCharacters(params)
  })
}

function syncUrl() {
  const q: Record<string, string> = {}
  if (typeFilter.value !== 'all') q.type = typeFilter.value
  if (selectedFolder.value) q.folderId = selectedFolder.value
  if (searchInput.value) q.search = searchInput.value
  if (statusFilter.value) q.status = statusFilter.value
  if (raceFilter.value) q.race = raceFilter.value
  if (classFilter.value) q.class = classFilter.value
  if (alignmentFilter.value) q.alignment = alignmentFilter.value
  if (orgFilter.value) q.org = orgFilter.value
  if (locationFilter.value) q.location = locationFilter.value
  if (!showCompanions.value) q.companions = 'false'
  if (sortField.value !== 'updatedAt') q.sort = sortField.value
  if (sortDir.value !== 'desc') q.sortDir = sortDir.value
  router.replace({ query: q })
}

function onFilterChange() {
  syncUrl()
  load()
}

function setType(t: string) {
  typeFilter.value = t
  selectedFolder.value = ''
  onFilterChange()
}

function toggleSortDir() {
  sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  onFilterChange()
}

function initFromUrl() {
  const q = route.query
  typeFilter.value = (q.type as string) || 'all'
  selectedFolder.value = (q.folderId as string) || ''
  searchInput.value = (q.search as string) || ''
  statusFilter.value = (q.status as string) || ''
  raceFilter.value = (q.race as string) || ''
  classFilter.value = (q.class as string) || ''
  alignmentFilter.value = (q.alignment as string) || ''
  orgFilter.value = (q.org as string) || ''
  locationFilter.value = (q.location as string) || ''
  showCompanions.value = q.companions !== 'false'
  sortField.value = (q.sort as string) || 'updatedAt'
  sortDir.value = (q.sortDir as string) || 'desc'
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
