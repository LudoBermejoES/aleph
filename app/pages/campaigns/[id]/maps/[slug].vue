<template>
  <div class="p-8">
    <div v-if="mapData">
      <!-- Breadcrumb -->
      <div class="flex items-center gap-2 text-sm text-muted-foreground mb-4">
        <NuxtLink :to="`/campaigns/${campaignId}`" class="hover:text-primary">Campaign</NuxtLink>
        <span>/</span>
        <NuxtLink :to="`/campaigns/${campaignId}/maps`" class="hover:text-primary">Maps</NuxtLink>
        <template v-for="(crumb, i) in mapData.breadcrumb" :key="crumb.id">
          <span>/</span>
          <NuxtLink v-if="i < mapData.breadcrumb.length - 1" :to="`/campaigns/${campaignId}/maps/${crumb.slug}`" class="hover:text-primary">{{ crumb.name }}</NuxtLink>
          <span v-else class="text-foreground">{{ crumb.name }}</span>
        </template>
      </div>

      <div class="flex items-start justify-between mb-6">
        <h1 class="text-2xl font-bold">{{ mapData.name }}</h1>
        <span v-if="mapData.width" class="text-sm text-muted-foreground">{{ mapData.width }}x{{ mapData.height }}px</span>
      </div>

      <!-- Map placeholder (Leaflet integration would go here) -->
      <div class="border border-border rounded-lg bg-muted/30 flex items-center justify-center" style="height: 500px;">
        <div class="text-center text-muted-foreground">
          <p class="text-lg mb-2">Map Viewer</p>
          <p class="text-sm">Leaflet.js integration pending image upload</p>
          <p v-if="mapData.pins?.length" class="text-sm mt-2">{{ mapData.pins.length }} pins placed</p>
        </div>
      </div>

      <!-- Pins List -->
      <div v-if="mapData.pins?.length" class="mt-6">
        <h2 class="text-lg font-semibold mb-3">Pins</h2>
        <div class="space-y-1">
          <div v-for="pin in mapData.pins" :key="pin.id" class="p-2 rounded border border-border flex items-center gap-3">
            <span v-if="pin.color" :style="{ backgroundColor: pin.color }" class="w-3 h-3 rounded-full" />
            <span class="text-sm">{{ pin.label || 'Unnamed pin' }}</span>
            <span class="text-xs text-muted-foreground">({{ pin.lat.toFixed(1) }}, {{ pin.lng.toFixed(1) }})</span>
          </div>
        </div>
      </div>

      <!-- Layers -->
      <div v-if="mapData.layers?.length" class="mt-6">
        <h2 class="text-lg font-semibold mb-3">Layers</h2>
        <div class="space-y-1">
          <div v-for="layer in mapData.layers" :key="layer.id" class="p-2 rounded border border-border flex items-center justify-between">
            <span class="text-sm">{{ layer.name }}</span>
            <span class="text-xs text-muted-foreground">{{ layer.type }} ({{ Math.round(layer.opacity * 100) }}%)</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const campaignId = route.params.id as string
const slug = route.params.slug as string
const mapData = ref<any>(null)

async function load() {
  try { mapData.value = await $fetch(`/api/campaigns/${campaignId}/maps/${slug}`) } catch { mapData.value = null }
}

onMounted(load)
</script>
