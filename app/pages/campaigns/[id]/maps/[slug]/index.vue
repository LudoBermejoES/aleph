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
        <div class="flex items-center gap-2">
          <NuxtLink :to="`/campaigns/${campaignId}/maps/${slug}/edit`">
            <Button variant="outline" size="sm">Edit</Button>
          </NuxtLink>
          <span v-if="mapData.width" class="text-sm text-muted-foreground">{{ mapData.width }}x{{ mapData.height }}px</span>
        </div>
      </div>

      <!-- Leaflet Map Viewer -->
      <ClientOnly>
        <MapViewer
          :image-path="mapData.imagePath"
          :width="mapData.width || 1024"
          :pins="mapData.pins"
          :layers="mapData.layers"
          :groups="mapData.groups"
          :regions="mapData.regions"
          :is-tiled="mapData.isTiled"
          :tile-url="`/api/campaigns/${campaignId}/maps/${slug}/tiles/{z}/{x}/{y}`"
          :campaign-id="campaignId"
          :height="600"
          @pin-click="onPinClick"
          @pin-shift-click="onPinShiftClick"
          @region-created="onRegionCreated"
        />
      </ClientOnly>

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
import type { CampaignMap } from '~/types/api'

const mapData = ref<CampaignMap | null>(null)
const api = useCampaignApi(campaignId)

async function load() {
  mapData.value = await api.getMap(slug).catch(() => null)
}

function onPinClick(pin: any) {
  // Pin click opens popup (handled by Leaflet)
}

function onPinShiftClick(pin: any) {
  if (pin.childMapId) {
    navigateTo(`/campaigns/${campaignId}/maps/${pin.childMapId}`)
  }
}

async function onRegionCreated(geojson: Record<string, unknown>) {
  try {
    await api.updateMapRegions(slug, { geojson, name: 'New Region' })
  } catch (e: unknown) {
    alert((e as { data?: { message?: string } })?.data?.message || 'Failed to save region')
  }
}

onMounted(load)
</script>
