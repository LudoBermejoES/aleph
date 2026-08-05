<template>
  <div class="p-8 max-w-5xl">
    <div class="flex items-center justify-between mb-6 flex-wrap gap-y-2">
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
    <div v-else-if="allLocations.length === 0" class="text-center py-12 text-muted-foreground">
      <p class="text-lg font-medium">{{ $t('locations.empty') }}</p>
      <p class="text-sm mt-1">{{ $t('locations.emptyDescription') }}</p>
    </div>
    <div v-else class="space-y-0.5">
      <LocationTreeNode
        v-for="node in treeRoots"
        :key="node.id"
        :node="node"
        :campaign-id="campaignId"
        :depth="0"
        :expanded-ids="expandedIds"
        @toggle="toggleExpand"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
interface LocationItem {
  id: string
  name: string
  slug: string
  subtype?: string
  parentId?: string | null
  parentName?: string | null
  childCount?: number
  inhabitantCount?: number
  imageUrl?: string | null
}

interface TreeNode extends LocationItem {
  children: TreeNode[]
}

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
const allLocations = ref<LocationItem[]>([])
const expandedIds = reactive(new Set<string>())

// Build tree from flat list
const treeRoots = computed<TreeNode[]>(() => {
  const byId = new Map<string, TreeNode>()
  const roots: TreeNode[] = []

  // Create nodes
  for (const loc of allLocations.value) {
    byId.set(loc.id, { ...loc, children: [] })
  }

  // Build parent→children relationships
  for (const loc of allLocations.value) {
    const node = byId.get(loc.id)!
    if (loc.parentId && byId.has(loc.parentId)) {
      byId.get(loc.parentId)!.children.push(node)
    } else {
      roots.push(node)
    }
  }

  // Sort: regions/villages first, then by name
  const subtypeOrder: Record<string, number> = {
    country: 0,
    region: 1,
    city: 2,
    town: 3,
    village: 4,
    dungeon: 5,
    wilderness: 6,
    building: 7,
    lair: 8,
    room: 9,
    other: 10,
  }
  function sortNodes(nodes: TreeNode[]) {
    nodes.sort((a, b) => {
      const ao = subtypeOrder[a.subtype ?? 'other'] ?? 10
      const bo = subtypeOrder[b.subtype ?? 'other'] ?? 10
      if (ao !== bo) return ao - bo
      return a.name.localeCompare(b.name)
    })
    for (const n of nodes) sortNodes(n.children)
  }
  sortNodes(roots)

  return roots
})

function toggleExpand(id: string) {
  if (expandedIds.has(id)) {
    expandedIds.delete(id)
  } else {
    expandedIds.add(id)
  }
}

async function load() {
  loading.value = true
  try {
    const params: Record<string, string> = { pageSize: '0' }
    if (search.value) params.search = search.value
    if (subtypeFilter.value) params.subtype = subtypeFilter.value
    const res = await api.getLocations(params)
    if (Array.isArray(res)) {
      allLocations.value = res
    } else {
      const paged = res as { data: LocationItem[] }
      allLocations.value = paged.data
    }
    // Auto-expand roots that have children
    for (const loc of allLocations.value) {
      if (!loc.parentId && (loc.childCount ?? 0) > 0) {
        expandedIds.add(loc.id)
      }
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
  searchTimer = setTimeout(() => load(), 300)
})

onMounted(load)
</script>
