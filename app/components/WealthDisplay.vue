<template>
  <div data-testid="wealth-display">
    <div v-if="loading" class="text-xs text-muted-foreground">Loading wealth…</div>
    <div v-else-if="balances.length" class="flex flex-wrap gap-2">
      <div
        v-for="b in balances"
        :key="b.currencyId"
        class="flex items-center gap-1 px-2 py-1 rounded bg-secondary text-secondary-foreground text-sm"
        :data-testid="`wealth-${b.currencyId}`"
      >
        <span class="font-medium">{{ b.amount }}</span>
        <span class="text-muted-foreground">{{ b.currencySymbol || b.currencyName }}</span>
      </div>
    </div>
    <p v-else class="text-sm text-muted-foreground">No wealth recorded.</p>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  campaignId: string
  ownerId: string
  ownerType: 'character' | 'party' | 'faction' | 'shop'
}>()

const balances = ref<any[]>([])
const loading = ref(true)

async function load() {
  loading.value = true
  try {
    balances.value = await useCampaignApi(props.campaignId).getWealth({ owner_id: props.ownerId, owner_type: props.ownerType })
  } catch {
    balances.value = []
  } finally {
    loading.value = false
  }
}

onMounted(load)
defineExpose({ reload: load })
</script>
