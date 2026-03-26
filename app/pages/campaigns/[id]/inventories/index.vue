<template>
  <div class="p-8">
    <div class="flex items-center gap-2 text-sm text-muted-foreground mb-1">
      <NuxtLink :to="`/campaigns/${campaignId}`" class="hover:text-primary">Campaign</NuxtLink>
      <span>/</span>
      <span>Inventories</span>
    </div>

    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold">Inventories</h1>
    </div>

    <!-- Filter by owner type -->
    <div class="flex gap-3 mb-4">
      <select v-model="ownerTypeFilter" @change="load" class="rounded-md border border-input bg-background px-3 py-2 text-sm" data-testid="inv-type-filter">
        <option value="">All Types</option>
        <option value="character">Character</option>
        <option value="party">Party</option>
        <option value="faction">Faction</option>
        <option value="shop">Shop</option>
      </select>
    </div>

    <LoadingSkeleton v-if="loading" :rows="4" />
    <div v-else-if="inventoryList.length" class="space-y-2">
      <NuxtLink
        v-for="inv in inventoryList"
        :key="inv.id"
        :to="`/campaigns/${campaignId}/inventories/${inv.id}`"
        class="block p-3 rounded border border-border hover:border-primary/50 transition-colors"
        :data-testid="`inv-row-${inv.id}`"
      >
        <div class="flex items-center justify-between">
          <div>
            <span class="font-medium">{{ inv.name }}</span>
            <span class="text-xs ml-2 px-2 py-0.5 rounded bg-secondary text-secondary-foreground">{{ inv.ownerType }}</span>
          </div>
          <span class="text-sm text-muted-foreground">{{ inv.items?.length ?? 0 }} items</span>
        </div>
      </NuxtLink>
    </div>
    <EmptyState v-else icon="🎒" title="No inventories yet" description="Inventories are created automatically with characters." />

    <ErrorToast v-if="error" :message="error" @dismiss="error = ''" />
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const campaignId = route.params.id as string
const inventoryList = ref<any[]>([])
const loading = ref(true)
const error = ref('')
const ownerTypeFilter = ref('')

async function load() {
  loading.value = true
  try {
    const params: Record<string, string> = {}
    if (ownerTypeFilter.value) params.owner_type = ownerTypeFilter.value
    inventoryList.value = await $fetch(`/api/campaigns/${campaignId}/inventories`, { params }) as any[]
  } catch {
    error.value = 'Failed to load inventories'
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>
