<template>
  <div
    class="relative"
    :style="{ height: height + 'px' }"
    @dragover.prevent="onDragOver"
    @drop.prevent="onDrop"
  >
    <div ref="mapContainer" class="w-full h-full rounded-lg border border-border"></div>

    <!-- Layer Toggle Panel -->
    <div
      v-if="layers.length"
      class="absolute top-3 right-3 z-[1000] bg-background border border-border rounded-lg shadow-lg p-2 max-w-48"
    >
      <p class="text-xs font-semibold mb-1 text-muted-foreground">Layers</p>
      <label
        v-for="layer in layers"
        :key="layer.id"
        class="flex items-center gap-2 text-xs py-0.5 cursor-pointer"
      >
        <input
          type="checkbox"
          :checked="layerVisibility[layer.id] ?? layer.visibleDefault"
          @change="toggleLayer(layer.id)"
        />
        {{ layer.name }}
      </label>
    </div>

    <!-- Group Toggle Panel -->
    <div
      v-if="groups.length"
      class="absolute top-3 left-3 z-[1000] bg-background border border-border rounded-lg shadow-lg p-2 max-w-48"
    >
      <p class="text-xs font-semibold mb-1 text-muted-foreground">Groups</p>
      <label
        v-for="group in groups"
        :key="group.id"
        class="flex items-center gap-2 text-xs py-0.5 cursor-pointer"
      >
        <input
          type="checkbox"
          :checked="groupVisibility[group.id] ?? group.visibleDefault"
          @change="toggleGroup(group.id)"
        />
        <span
          v-if="group.color"
          :style="{ backgroundColor: group.color }"
          class="w-2 h-2 rounded-full inline-block"
        ></span>
        {{ group.name }}
      </label>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, computed } from 'vue'
import type { Map as LeafletMap, Marker } from 'leaflet'
import {
  buildImageMapInitOptions,
  buildOsmMapInitOptions,
  pinToLeafletLatLng,
  leafletLatLngToPin,
  ENTITY_DRAG_MIME,
  type MapType,
} from '~/utils/mapPinGeometry'

const props = defineProps<{
  imagePath?: string
  imageWidth?: number
  imageHeight?: number
  /**
   * 'image' (default, current behavior: CRS.Simple + fitBounds on the image's pixel
   * dimensions) or 'osm' (Leaflet's default Web Mercator CRS + setView on a stored
   * center/zoom). See openspec/changes/add-osm-maps/design.md D1.
   */
  mapType?: MapType
  /** 'osm' maps only -- the stored initial view (design.md's "Initial View" requirement). */
  centerLat?: number | null
  centerLng?: number | null
  defaultZoom?: number | null
  /** Attribution shown for the tile layer -- required for 'osm', unused for 'image'. */
  attribution?: string
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
  /** Gates the drop handler client-side; the server is still the source of truth (design.md D6). */
  canCreatePins?: boolean
}>()

type MapPin = NonNullable<typeof props.pins>[number]

const emit = defineEmits<{
  pinClick: [pin: MapPin]
  regionCreated: [geojson: Record<string, unknown>]
  pinShiftClick: [pin: MapPin]
  /** Fired on a successful entity drop, with lat/lng already converted for this map's type. */
  pinDrop: [payload: { lat: number; lng: number; entityId: string }]
}>()

const mapContainer = ref<HTMLDivElement>()
const layerVisibility = reactive<Record<string, boolean>>({})
const groupVisibility = reactive<Record<string, boolean>>({})

let map: LeafletMap | null = null
let markers: Marker[] = []

const mapType = computed<MapType>(() => props.mapType ?? 'image')

onMounted(async () => {
  if (!mapContainer.value) return

  const L = await import('leaflet')
  await import('leaflet/dist/leaflet.css')

  if (mapType.value === 'osm') {
    await initOsmMap(L)
  } else {
    await initImageMap(L)
  }

  // Add pins
  renderPins(L)

  // Render existing regions as GeoJSON
  if (props.regions?.length) {
    for (const region of props.regions) {
      try {
        const geojson =
          typeof region.geojson === 'string' ? JSON.parse(region.geojson) : region.geojson
        L.geoJSON(geojson, {
          style: { color: region.color || '#3b82f6', fillOpacity: region.opacity ?? 0.3 },
        }).addTo(map!)
      } catch {
        /* invalid geojson */
      }
    }
  }

  // Initialize Geoman drawing tools if editor+ role
  try {
    await import('@geoman-io/leaflet-geoman-free')
    await import('@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css')
    map!.pm.addControls({
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

    map!.on('pm:create', (e: { layer: { toGeoJSON: () => Record<string, unknown> } }) => {
      const geojson = e.layer.toGeoJSON()
      emit('regionCreated', geojson)
    })
  } catch {
    // Geoman not available -- drawing tools disabled
  }

  // Initialize layer/group visibility
  props.layers?.forEach((l) => {
    layerVisibility[l.id] = l.visibleDefault
  })
  props.groups?.forEach((g) => {
    groupVisibility[g.id] = g.visibleDefault
  })
})

/**
 * 'image' maps (design.md D1): CRS.Simple, bounds/zoom derived from the image's pixel
 * dimensions, tiles served locally by this app. Unchanged from before this component
 * supported a second map type.
 */
async function initImageMap(L: typeof import('leaflet')) {
  if (!mapContainer.value) return

  const imgWidth = props.imageWidth || 1024
  const imgHeight = props.imageHeight || 768
  const { maxZoom, boundsHeight, boundsWidth } = buildImageMapInitOptions(imgWidth, imgHeight)
  const bounds = L.latLngBounds([-boundsHeight, 0], [0, boundsWidth])

  map = L.map(mapContainer.value, {
    crs: L.CRS.Simple,
    minZoom: 0,
    maxZoom,
    maxBounds: bounds.pad(0.5),
    zoomSnap: 0.5,
  })

  map.fitBounds(bounds)

  // Always use tileLayer — all image maps are tiled
  if (props.tileUrl) {
    L.tileLayer(props.tileUrl, {
      tileSize: 256,
      minZoom: 0,
      maxZoom,
      noWrap: true,
    }).addTo(map)
  } else {
    map.setView([-boundsHeight / 2, boundsWidth / 2], 0)
  }
}

/**
 * 'osm' maps (design.md D1/D3): Leaflet's default Web Mercator CRS (EPSG:3857), a stored
 * center/zoom instead of fitBounds on a pixel box, and a real tile source that requires
 * attribution.
 */
async function initOsmMap(L: typeof import('leaflet')) {
  if (!mapContainer.value) return

  const { center, zoom } = buildOsmMapInitOptions(
    props.centerLat,
    props.centerLng,
    props.defaultZoom,
  )

  map = L.map(mapContainer.value, {
    // No `crs` option -- Leaflet defaults to EPSG:3857, which is what real OSM tiles need.
  })
  map.setView(center, zoom)

  if (props.tileUrl) {
    L.tileLayer(props.tileUrl, {
      maxZoom: 19,
      attribution: props.attribution || '&copy; OpenStreetMap contributors',
    }).addTo(map)
  }
}

function renderPins(L: typeof import('leaflet')) {
  if (!map || !props.pins) return

  markers.forEach((m) => m.remove())
  markers = []

  for (const pin of props.pins) {
    if (pin.groupId && groupVisibility[pin.groupId] === false) continue

    const color = pin.color || '#3b82f6'
    const divIcon = L.divIcon({
      className: 'custom-pin',
      html: `<div style="width:16px;height:16px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.3);"></div>`,
      iconSize: [16, 16],
      iconAnchor: [8, 8],
    })

    const [lat, lng] = pinToLeafletLatLng(pin, mapType.value, props.imageWidth, props.imageHeight)
    const marker = L.marker([lat, lng], { icon: divIcon }).addTo(map)

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
  if (map) {
    import('leaflet').then((L) => renderPins(L))
  }
}

/**
 * Drag-and-drop pin creation (design.md D6): available for BOTH map types, same event
 * shape, only the lat/lng conversion differs. The entity picker panel that originates the
 * drag lives on the map detail page, not here.
 */
function onDragOver(event: DragEvent) {
  if (!props.canCreatePins) return
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy'
}

function onDrop(event: DragEvent) {
  if (!props.canCreatePins) return
  if (!map) return
  const entityId = event.dataTransfer?.getData(ENTITY_DRAG_MIME)
  if (!entityId) return

  // Leaflet computes this from the container's own coordinate space, which is already
  // CRS.Simple-scaled units for an 'image' map and real WGS84 degrees for an 'osm' map.
  const latlng = map.mouseEventToLatLng(event)
  const { lat, lng } = leafletLatLngToPin(
    latlng,
    mapType.value,
    props.imageWidth,
    props.imageHeight,
  )

  emit('pinDrop', { lat, lng, entityId })
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
