<template>
  <div class="p-8 max-w-5xl">
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold">{{ $t('locations.title') }}</h1>
      <NuxtLink :to="`/campaigns/${campaignId}/locations/new`">
        <Button>{{ $t('locations.new') }}</Button>
      </NuxtLink>
    </div>

    <div class="mb-4 flex gap-3">
      <input
        v-model="search"
        class="flex-1 px-3 py-2 rounded border border-input bg-background text-sm"
        :placeholder="$t('search.placeholder')"
      />
      <select
        v-model="subtypeFilter"
        class="px-3 py-2 rounded border border-input bg-background text-sm"
      >
        <option value="">{{ $t('locations.subtype') }}: {{ $t('common.all') ?? 'All' }}</option>
        <option v-for="s in subtypes" :key="s" :value="s">
          {{ $t(`locations.subtypes.${s}`) }}
        </option>
      </select>
    </div>

    <div v-if="loading" class="text-muted-foreground">{{ $t('common.loading') }}</div>
    <div v-else-if="locations.length === 0" class="text-center py-12 text-muted-foreground">
      <p class="text-lg font-medium">{{ $t('locations.empty') }}</p>
      <p class="text-sm mt-1">{{ $t('locations.emptyDescription') }}</p>
    </div>
    <div v-else class="space-y-2">
      <div
        v-for="loc in locations"
        :key="loc.id"
        class="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-accent/30 transition-colors"
      >
        <div class="flex-1 min-w-0">
          <NuxtLink
            :to="`/campaigns/${campaignId}/locations/${loc.slug}`"
            class="font-medium hover:text-primary"
          >
            {{ loc.name }}
          </NuxtLink>
          <div class="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
            <span v-if="loc.parentName">{{ loc.parentName }} /</span>
            <span class="capitalize">{{ loc.subtype || $t('locations.subtypes.other') }}</span>
            <span v-if="loc.inhabitantCount > 0"
              >· {{ loc.inhabitantCount }} {{ $t('characters.title').toLowerCase() }}</span
            >
            <span v-if="loc.childCount > 0">· {{ loc.childCount }} sub-locations</span>
          </div>
        </div>
        <span class="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground capitalize">{{
          $t(`locations.subtypes.${loc.subtype || 'other'}`)
        }}</span>
      </div>
      <PaginationControls
        :page="pagination.page.value"
        :page-size="pagination.pageSize.value"
        :total="pagination.total.value"
        :total-pages="pagination.totalPages.value"
        @change="
          (p) => {
            pagination.setPage(p)
            load()
          }
        "
      />
    </div>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const campaignId = route.params.id as string
const api = useCampaignApi(campaignId)

const SUBTYPES = [
  'country',
  'region',
  'city',
  'town',
  'village',
  'dungeon',
  'lair',
  'building',
  'room',
  'wilderness',
  'other',
]
const subtypes = SUBTYPES

const search = ref('')
const subtypeFilter = ref('')
const loading = ref(true)
const locations = ref<any[]>([])
const pagination = usePagination()

async function load() {
  loading.value = true
  try {
    const params: Record<string, string> = { ...pagination.queryParams() }
    if (search.value) params.search = search.value
    if (subtypeFilter.value) params.subtype = subtypeFilter.value
    const res = await api.getLocations(params as any)
    if (Array.isArray(res)) {
      locations.value = res
    } else {
      locations.value = (res as any).data
      pagination.updateMeta((res as any).meta)
    }
  } catch {
    /* empty */
  } finally {
    loading.value = false
  }
}

let searchTimer: ReturnType<typeof setTimeout>
watch([search, subtypeFilter], () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    pagination.setPage(1)
    load()
  }, 300)
})

onMounted(load)
</script>
