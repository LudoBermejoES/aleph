<template>
  <div data-testid="inventory-panel">
    <div v-if="loading" class="text-xs text-muted-foreground">{{ $t('inventoryPanel.loading') }}</div>
    <div v-else-if="inventory">
      <div class="flex items-center justify-between mb-3">
        <h3 class="font-semibold text-sm">{{ inventory.name }}</h3>
        <button
          v-if="inventory.items?.length"
          @click="showTransfer = true"
          class="text-xs text-primary hover:underline"
          data-testid="transfer-item-btn"
        >
          {{ $t('inventoryPanel.transferItem') }}
        </button>
      </div>

      <!-- Group items by position -->
      <div v-for="pos in positions" :key="pos.key" class="mb-3">
        <div v-if="itemsByPosition[pos.key]?.length">
          <div class="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">{{ pos.label }}</div>
          <div class="space-y-1">
            <div
              v-for="it in itemsByPosition[pos.key]"
              :key="it.id"
              class="flex items-center justify-between p-2 rounded border border-border text-sm"
              :data-testid="`inv-item-${it.id}`"
            >
              <div class="flex items-center gap-2">
                <span class="font-medium">{{ it.itemName }}</span>
                <span :class="['text-xs px-1.5 py-0.5 rounded', rarityColor(it.itemRarity)]">{{ it.itemRarity }}</span>
              </div>
              <span class="text-muted-foreground text-xs">×{{ it.quantity }}</span>
            </div>
          </div>
        </div>
      </div>

      <EmptyState v-if="!inventory.items?.length" icon="🎒" :title="$t('inventoryPanel.emptyInventory')" :description="$t('inventories.noItems')" />
    </div>
    <p v-else class="text-sm text-muted-foreground">{{ $t('inventoryPanel.noInventory') }}</p>

    <ItemTransferDialog
      v-if="showTransfer && inventory"
      :campaign-id="campaignId"
      :from-inventory-id="inventory.id"
      :items="inventory.items || []"
      @close="showTransfer = false"
      @transferred="onTransferred"
    />
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n()

const props = defineProps<{
  campaignId: string
  ownerId: string
  ownerType: 'character' | 'party' | 'faction' | 'shop'
}>()

const inventory = ref<any>(null)
const loading = ref(true)
const showTransfer = ref(false)

const positions = computed(() => [
  { key: 'equipped', label: t('inventories.positionEquipped') },
  { key: 'backpack', label: t('inventories.positionBackpack') },
  { key: 'storage', label: t('inventories.positionStorage') },
  { key: 'trade', label: t('inventories.positionTrade') },
  { key: 'custom', label: t('inventories.positionOther') },
])

const itemsByPosition = computed(() => {
  const items = inventory.value?.items || []
  return positions.value.reduce((acc: Record<string, any[]>, pos) => {
    acc[pos.key] = items.filter((i: any) => i.position === pos.key)
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
    const all = await useCampaignApi(props.campaignId).getInventories({ owner_id: props.ownerId, owner_type: props.ownerType })
    inventory.value = all[0] || null
  } catch {
    inventory.value = null
  } finally {
    loading.value = false
  }
}

function onTransferred() {
  showTransfer.value = false
  load()
}

onMounted(load)
defineExpose({ reload: load })
</script>
