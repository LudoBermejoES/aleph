<template>
  <div class="p-8">
    <div v-if="shop">
      <div class="flex items-center gap-2 text-sm text-muted-foreground mb-4">
        <NuxtLink :to="`/campaigns/${campaignId}`" class="hover:text-primary">Campaign</NuxtLink>
        <span>/</span>
        <NuxtLink :to="`/campaigns/${campaignId}/shops`" class="hover:text-primary">{{ $t('shops.title') }}</NuxtLink>
        <span>/</span>
        <span class="text-foreground">{{ shop.name }}</span>
      </div>

      <h1 class="text-2xl font-bold mb-2">{{ shop.name }}</h1>
      <p v-if="shop.description" class="text-muted-foreground mb-6">{{ shop.description }}</p>

      <h2 class="text-lg font-semibold mb-3">{{ $t('shops.stock') }}</h2>
      <div v-if="shop.stock?.length" class="space-y-2">
        <div v-for="item in shop.stock" :key="item.id" class="p-3 rounded border border-border flex items-center justify-between">
          <div>
            <span class="font-medium">{{ item.itemName }}</span>
            <span :class="['text-xs ml-2 px-2 py-0.5 rounded', item.itemRarity === 'legendary' ? 'bg-amber-100 text-amber-700' : 'bg-secondary text-secondary-foreground']">{{ item.itemRarity }}</span>
          </div>
          <div class="flex items-center gap-3">
            <span class="text-sm text-muted-foreground">{{ item.quantity === -1 ? $t('shops.unlimited') : item.quantity }} {{ $t('shops.inStock') }}</span>
            <span v-if="item.itemPriceJson" class="text-sm">{{ item.priceOverrideJson || item.itemPriceJson }}</span>
          </div>
        </div>
      </div>
      <p v-else class="text-muted-foreground">{{ $t('shops.noStock') }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const campaignId = route.params.id as string
const slug = route.params.slug as string
const api = useCampaignApi(campaignId)
const shop = ref<any>(null)

async function load() {
  try { shop.value = await api.getShop(slug) } catch { shop.value = null }
}

onMounted(load)
</script>
