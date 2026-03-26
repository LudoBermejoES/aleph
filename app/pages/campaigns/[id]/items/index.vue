<template>
  <div class="p-8">
    <div class="flex items-center gap-2 text-sm text-muted-foreground mb-1">
      <NuxtLink :to="`/campaigns/${campaignId}`" class="hover:text-primary">Campaign</NuxtLink>
      <span>/</span><span>Items</span>
    </div>
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold">Item Library</h1>
      <NuxtLink :to="`/campaigns/${campaignId}/items/new`">
        <Button data-testid="new-item-btn">New Item</Button>
      </NuxtLink>
    </div>
    <div class="flex gap-3 mb-4">
      <select v-model="filter" @change="load" class="rounded-md border border-input bg-background px-3 py-2 text-sm">
        <option value="">All Rarities</option><option value="common">Common</option><option value="uncommon">Uncommon</option>
        <option value="rare">Rare</option><option value="very_rare">Very Rare</option><option value="legendary">Legendary</option>
      </select>
    </div>
    <LoadingSkeleton v-if="loading" :rows="4" />
    <div v-else-if="itemList.length" class="space-y-2">
      <div v-for="item in itemList" :key="item.id" class="p-3 rounded border border-border flex items-center justify-between">
        <div>
          <span class="font-medium">{{ item.name }}</span>
          <span :class="['text-xs ml-2 px-2 py-0.5 rounded', rarityColor(item.rarity)]">{{ item.rarity }}</span>
        </div>
        <span v-if="item.priceJson" class="text-xs text-muted-foreground">{{ item.priceJson }}</span>
      </div>
    </div>
    <EmptyState v-else icon="🎒" title="No items yet" description="Create your first item to get started." />
    <ErrorToast v-if="error" :message="error" @dismiss="dismissError" />
  </div>
</template>

<script setup lang="ts">

const route = useRoute()
const campaignId = route.params.id as string
const api = useCampaignApi(campaignId)
const itemList = ref<any[]>([])
const filter = ref('')
const { loading, error, withLoading, dismissError } = useLoadingState()

function rarityColor(r: string) {
  const map: Record<string, string> = {
    common: 'bg-secondary text-secondary-foreground', uncommon: 'bg-green-100 text-green-700',
    rare: 'bg-blue-100 text-blue-700', very_rare: 'bg-purple-100 text-purple-700',
    legendary: 'bg-amber-100 text-amber-700',
  }
  return map[r] || map.common
}

async function load() {
  await withLoading(async () => {
    const params: Record<string, string> = {}
    if (filter.value) params.rarity = filter.value
    itemList.value = await api.getItems(params)
  })
}

onMounted(load)
</script>
