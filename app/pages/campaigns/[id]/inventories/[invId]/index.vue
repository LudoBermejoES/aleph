<template>
  <div class="p-8">
    <div v-if="inventory">
      <div class="flex items-center gap-2 text-sm text-muted-foreground mb-4">
        <NuxtLink :to="`/campaigns/${campaignId}`" class="hover:text-primary">Campaign</NuxtLink>
        <span>/</span>
        <NuxtLink :to="`/campaigns/${campaignId}/inventories`" class="hover:text-primary">Inventories</NuxtLink>
        <span>/</span>
        <span class="text-foreground">{{ inventory.name }}</span>
      </div>

      <div class="flex items-start justify-between mb-6">
        <div>
          <h1 class="text-2xl font-bold">{{ inventory.name }}</h1>
          <span class="text-xs px-2 py-0.5 rounded bg-secondary text-secondary-foreground">{{ inventory.ownerType }}</span>
        </div>
        <button
          v-if="inventory.items?.length"
          @click="showTransfer = true"
          class="px-3 py-1.5 rounded-md border border-border text-sm hover:bg-accent"
          data-testid="transfer-btn"
        >
          Transfer item
        </button>
      </div>

      <!-- Items grouped by position -->
      <div v-for="pos in positions" :key="pos.key" class="mb-6">
        <div v-if="itemsByPosition[pos.key]?.length">
          <h2 class="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-2">{{ pos.label }}</h2>
          <div class="space-y-2">
            <div
              v-for="it in itemsByPosition[pos.key]"
              :key="it.id"
              class="p-3 rounded border border-border flex items-center justify-between"
              :data-testid="`item-row-${it.id}`"
            >
              <div class="flex items-center gap-2">
                <span class="font-medium">{{ it.itemName }}</span>
                <span :class="['text-xs px-1.5 py-0.5 rounded', rarityColor(it.itemRarity)]">{{ it.itemRarity }}</span>
              </div>
              <div class="flex items-center gap-3">
                <span v-if="it.notes" class="text-xs text-muted-foreground">{{ it.notes }}</span>
                <span class="text-sm font-medium">×{{ it.quantity }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <EmptyState v-if="!inventory.items?.length" icon="🎒" title="Empty inventory" description="No items yet." />
    </div>

    <LoadingSkeleton v-if="loading" :rows="4" />

    <ItemTransferDialog
      v-if="showTransfer && inventory"
      :campaign-id="campaignId"
      :from-inventory-id="inventory.id"
      :items="inventory.items || []"
      @close="showTransfer = false"
      @transferred="onTransferred"
    />

    <ErrorToast v-if="error" :message="error" @dismiss="error = ''" />
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const campaignId = route.params.id as string
const invId = route.params.invId as string
const api = useCampaignApi(campaignId)
const inventory = ref<any>(null)
const loading = ref(true)
const error = ref('')
const showTransfer = ref(false)

const positions = [
  { key: 'equipped', label: 'Equipped' },
  { key: 'backpack', label: 'Backpack' },
  { key: 'storage', label: 'Storage' },
  { key: 'trade', label: 'Trade' },
  { key: 'custom', label: 'Other' },
]

const itemsByPosition = computed(() => {
  const itms = inventory.value?.items || []
  return positions.reduce((acc: Record<string, any[]>, pos) => {
    acc[pos.key] = itms.filter((i: any) => i.position === pos.key)
    return acc
  }, {})
})

function rarityColor(r: string) {
  const map: Record<string, string> = {
    common: 'bg-secondary text-secondary-foreground',
    uncommon: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
    rare: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
    very_rare: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
    legendary: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
    artifact: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
  }
  return map[r] || map.common
}

async function load() {
  loading.value = true
  try {
    // Use list endpoint filtered by id
    const all = await api.getInventories()
    inventory.value = all.find((i: { id: string }) => i.id === invId) || null
    if (!inventory.value) error.value = 'Inventory not found'
  } catch {
    error.value = 'Failed to load inventory'
  } finally {
    loading.value = false
  }
}

function onTransferred() {
  showTransfer.value = false
  load()
}

onMounted(load)
</script>
