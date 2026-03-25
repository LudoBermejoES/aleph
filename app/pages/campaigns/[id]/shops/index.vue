<template>
  <div class="p-8">
    <div class="flex items-center gap-2 text-sm text-muted-foreground mb-1">
      <NuxtLink :to="`/campaigns/${campaignId}`" class="hover:text-primary">Campaign</NuxtLink>
      <span>/</span><span>Shops</span>
    </div>
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold">Shops</h1>
      <NuxtLink :to="`/campaigns/${campaignId}/shops/new`">
        <Button data-testid="new-shop-btn">New Shop</Button>
      </NuxtLink>
    </div>
    <div v-if="shopList.length" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <Card v-for="shop in shopList" :key="shop.id" class="h-full">
        <CardHeader>
          <CardTitle class="text-lg">{{ shop.name }}</CardTitle>
          <CardDescription v-if="shop.description">{{ shop.description }}</CardDescription>
        </CardHeader>
      </Card>
    </div>
    <p v-else class="text-muted-foreground text-center py-8">No shops yet.</p>
  </div>
</template>

<script setup lang="ts">

const route = useRoute()
const campaignId = route.params.id as string
const shopList = ref<any[]>([])

async function load() {
  try { shopList.value = await $fetch(`/api/campaigns/${campaignId}/shops`) as any[] } catch { shopList.value = [] }
}

onMounted(load)
</script>
