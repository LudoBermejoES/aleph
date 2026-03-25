<template>
  <div class="relative" :style="{ height: height + 'px' }">
    <div ref="mapContainer" class="w-full h-full rounded-lg border border-border" />

    <!-- Layer Toggle Panel -->
    <div v-if="layers.length" class="absolute top-3 right-3 z-[1000] bg-background border border-border rounded-lg shadow-lg p-2 max-w-48">
      <p class="text-xs font-semibold mb-1 text-muted-foreground">Layers</p>
      <label v-for="layer in layers" :key="layer.id" class="flex items-center gap-2 text-xs py-0.5 cursor-pointer">
        <input type="checkbox" :checked="layerVisibility[layer.id] ?? layer.visibleDefault" @change="toggleLayer(layer.id)" />
        {{ layer.name }}
      </label>
    </div>

    <!-- Group Toggle Panel -->
    <div v-if="groups.length" class="absolute top-3 left-3 z-[1000] bg-background border border-border rounded-lg shadow-lg p-2 max-w-48">
      <p class="text-xs font-semibold mb-1 text-muted-foreground">Groups</p>
      <label v-for="group in groups" :key="group.id" class="flex items-center gap-2 text-xs py-0.5 cursor-pointer">
        <input type="checkbox" :checked="groupVisibility[group.id] ?? group.visibleDefault" @change="toggleGroup(group.id)" />
        <span v-if="group.color" :style="{ backgroundColor: group.color }" class="w-2 h-2 rounded-full inline-block" />
        {{ group.name }}
      </label>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, watch } from 'vue'
import type { Map as LeafletMap, ImageOverlay, Marker } from 'leaflet'

const props = defineProps<{
  imagePath?: string
  width?: number
  height?: number
  pins?: Array<{
    id: string
    label?: string
    lat: number
    lng: number
    icon?: string
    color?: string
    entityId?: string
    childMapId?: string
    groupId?: string
  }>
  layers?: Array<{
    id: string
    name: string
    type: string
    imagePath?: string
    opacity: number
    visibleDefault: boolean
  }>
  groups?: Array<{
    id: string
    name: string
    color?: string
    visibleDefault: boolean
  }>
  regions?: Array<{
    id: string
    geojson: string
    color?: string
    opacity?: number
  }>
  isTiled?: boolean
  tileUrl?: string
  height?: number
  campaignId?: string
}>()

const emit = defineEmits<{
  pinClick: [pin: any]
  regionCreated: [geojson: any]
  pinShiftClick: [pin: any]
}>()

const mapContainer = ref<HTMLDivElement>()
const layerVisibility = reactive<Record<string, boolean>>({})
const groupVisibility = reactive<Record<string, boolean>>({})

let map: LeafletMap | null = null
let markers: Marker[] = []

onMounted(async () => {
  if (!mapContainer.value) return

  // Dynamic import to avoid SSR issues
  const L = await import('leaflet')
  await import('leaflet/dist/leaflet.css')

  const imgWidth = props.width || 1024
  const imgHeight = props.height || 768
  const bounds = L.latLngBounds([0, 0], [imgHeight, imgWidth])

  map = L.map(mapContainer.value, {
    crs: L.CRS.Simple,
    minZoom: -2,
    maxZoom: 4,
    maxBounds: bounds.pad(0.5),
    zoomSnap: 0.5,
  })

  map.fitBounds(bounds)

  // Add map image layer
  if (props.isTiled && props.tileUrl) {
    // Tiled map -- use L.tileLayer
    L.tileLayer(props.tileUrl, {
      minZoom: -2,
      maxZoom: 4,
      tileSize: 256,
      noWrap: true,
    }).addTo(map)
  } else if (props.imagePath) {
    // Non-tiled -- use image overlay
    L.imageOverlay(props.imagePath, bounds).addTo(map)
  } else {
    // No image yet
    map.setView([imgHeight / 2, imgWidth / 2], 0)
  }

  // Add pins
  renderPins(L)

  // Render existing regions as GeoJSON
  if (props.regions?.length) {
    for (const region of props.regions) {
      try {
        const geojson = typeof region.geojson === 'string' ? JSON.parse(region.geojson) : region.geojson
        L.geoJSON(geojson, {
          style: { color: region.color || '#3b82f6', fillOpacity: region.opacity ?? 0.3 },
        }).addTo(map)
      } catch { /* invalid geojson */ }
    }
  }

  // Initialize Geoman drawing tools if editor+ role
  try {
    await import('@geoman-io/leaflet-geoman-free')
    await import('@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css')
    map.pm.addControls({
      position: 'topleft',
      drawMarker: false,
      drawCircleMarker: false,
      drawText: false,
      drawCircle: false,
      editMode: true,
      dragMode: true,
      cutPolygon: false,
      removalMode: true,
    })

    map.on('pm:create', (e: any) => {
      const geojson = e.layer.toGeoJSON()
      emit('regionCreated', geojson)
    })
  } catch {
    // Geoman not available -- drawing tools disabled
  }

  // Initialize layer/group visibility
  props.layers?.forEach(l => { layerVisibility[l.id] = l.visibleDefault })
  props.groups?.forEach(g => { groupVisibility[g.id] = g.visibleDefault })
})

function renderPins(L: typeof import('leaflet')) {
  if (!map || !props.pins) return

  // Clear existing markers
  markers.forEach(m => m.remove())
  markers = []

  for (const pin of props.pins) {
    // Check group visibility
    if (pin.groupId && groupVisibility[pin.groupId] === false) continue

    const color = pin.color || '#3b82f6'
    const divIcon = L.divIcon({
      className: 'custom-pin',
      html: `<div style="width:16px;height:16px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.3);"></div>`,
      iconSize: [16, 16],
      iconAnchor: [8, 8],
    })

    const marker = L.marker([pin.lat, pin.lng], { icon: divIcon }).addTo(map)

    // Popup
    const popupContent = `
      <div style="min-width:120px;">
        <strong>${pin.label || 'Pin'}</strong>
        ${pin.entityId ? `<br><a href="/campaigns/${props.campaignId}/entities/${pin.entityId}" style="color:#3b82f6;text-decoration:underline;font-size:12px;">View Entity</a>` : ''}
        ${pin.childMapId ? `<br><span style="font-size:12px;color:#666;">Shift+click to explore</span>` : ''}
      </div>
    `
    marker.bindPopup(popupContent)

    marker.on('click', (e) => {
      if ((e.originalEvent as MouseEvent).shiftKey && pin.childMapId) {
        emit('pinShiftClick', pin)
      } else {
        emit('pinClick', pin)
      }
    })

    markers.push(marker)
  }
}

function toggleLayer(layerId: string) {
  layerVisibility[layerId] = !layerVisibility[layerId]
  // TODO: show/hide overlay image layers on the map
}

function toggleGroup(groupId: string) {
  groupVisibility[groupId] = !groupVisibility[groupId]
  // Re-render pins with updated group visibility
  if (map) {
    import('leaflet').then(L => renderPins(L))
  }
}

onUnmounted(() => {
  map?.remove()
  map = null
})
</script>

<style>
/* Leaflet CSS overrides */
.leaflet-container {
  background: hsl(var(--muted));
  font-family: inherit;
}
</style>
