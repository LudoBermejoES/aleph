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
import { onMounted, onUnmounted, computed, watch } from 'vue'
import type { Map as LeafletMap, Marker, LatLng as LeafletLatLng } from 'leaflet'
import {
  buildImageMapInitOptions,
  buildOsmMapInitOptions,
  pinToLeafletLatLng,
  leafletLatLngToPin,
  ENTITY_DRAG_MIME,
  type MapType,
} from '~/utils/mapPinGeometry'
import {
  buildPinMarkerHtml,
  markerIconSize,
  pinSizeForZoom,
  MARKER_SIZE_MIN,
  buildPinPopupHtml,
  type PopupLabels,
} from '~/utils/mapPinMarker'

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
    /** Linked entity's image/type, joined + visibility-filtered server-side (design.md D3). */
    entityImageUrl?: string | null
    entityType?: string | null
    entitySlug?: string | null
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
  /** Gates whether the popup's delete button renders at all (design.md D4) -- same role gate
   *  as canCreatePins, the server remains the authority on the DELETE request itself. */
  canDeletePins?: boolean
  /** i18n strings for the popup -- kept out of mapPinMarker.ts, which must stay framework-free. */
  popupLabels?: PopupLabels
}>()

type MapPin = NonNullable<typeof props.pins>[number]

const emit = defineEmits<{
  pinClick: [pin: MapPin]
  regionCreated: [geojson: Record<string, unknown>]
  pinShiftClick: [pin: MapPin]
  /** Fired on a successful entity drop, with lat/lng already converted for this map's type. */
  pinDrop: [payload: { lat: number; lng: number; entityId: string }]
  /** Fired when the popup's delete button is clicked (design.md D4). */
  pinDelete: [pinId: string]
  /**
   * Fired on a successful drag-end, with lat/lng already converted for this map's type
   * (move-pins-and-resolve-entity-images/design.md D1). `onSuccess`/`onError` let the page
   * update `mapData.value.pins[i]` in place without a re-render on success, and snap the
   * marker back to `previousLatLng` on a rejected PATCH -- both without this component
   * needing to know anything about the API call itself.
   */
  pinMove: [
    payload: {
      pinId: string
      lat: number
      lng: number
      previousLatLng: [number, number]
      onSuccess: () => void
      onError: () => void
    },
  ]
}>()

const DEFAULT_POPUP_LABELS: PopupLabels = {
  pinFallback: 'Pin',
  viewEntity: 'View Entity',
  exploreHint: 'Shift+click to explore',
  deletePin: 'Delete pin',
}

const mapContainer = ref<HTMLDivElement>()
const layerVisibility = reactive<Record<string, boolean>>({})
const groupVisibility = reactive<Record<string, boolean>>({})

let map: LeafletMap | null = null
let markers: Marker[] = []
// El marcador solo no basta para reconstruir su icono: hace falta el pin que lo generó
// (nivel de imagen/tipo/color). Se guardan emparejados en vez de re-buscar en props.pins,
// que puede haber cambiado de orden entre un render y un zoom.
let markerPins: { marker: Marker; pin: MapPin }[] = []

const mapType = computed<MapType>(() => props.mapType ?? 'image')

// move-pins-and-resolve-entity-images/design.md D1: set right before a successful drag's
// caller is expected to write the new coordinates into `mapData.value.pins[i]` (the SAME
// array this watcher observes), so that ONE resulting watcher tick is swallowed instead of
// rebuilding every marker -- the marker's own position is already correct on screen from
// Leaflet's native drag, and a full renderPins() here would flicker and close an open popup.
// Reset on a failed move too, since no mutation will follow it and the flag must not linger
// to swallow some later, unrelated pins change (a create/delete elsewhere).
let suppressNextPinsRender = false

// design.md D1 (improve-map-pin-markers-and-deletion): appending/removing a pin (index.vue
// no longer calls load() for either) must re-render markers in place without rebuilding the
// map. `deep` because the parent mutates the SAME array (push/splice/index-assignment)
// rather than replacing it with a new reference.
watch(
  () => props.pins,
  () => {
    if (suppressNextPinsRender) {
      suppressNextPinsRender = false
      return
    }
    if (!map) return
    import('leaflet').then((L) => renderPins(L))
  },
  { deep: true },
)

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

  // El tamaño del pin sigue al zoom (32px en el zoom más amplio, 96px en el más detallado).
  // `zoomend` y no `zoom`: durante la animación se dispara en cada fotograma y reconstruir
  // el icono de cada marcador ahí se ve como un tirón.
  map?.on('zoomend', () => rescalePins(L))

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

/** El tamaño que le toca a un pin con el zoom actual del mapa. */
function currentPinSize(): number {
  if (!map) return MARKER_SIZE_MIN
  // `getMinZoom`/`getMaxZoom` los da Leaflet a partir de las opciones del propio mapa, así
  // que un mapa de imagen (cuyo maxZoom sale de las dimensiones de la imagen) escala en SU
  // rango y no en el 0..19 de OSM.
  return pinSizeForZoom(map.getZoom(), map.getMinZoom() ?? 0, map.getMaxZoom() ?? 19)
}

/**
 * Reescala los iconos sin reconstruir los marcadores: `setIcon` sobre los que ya existen.
 *
 * Volver a llamar a `renderPins` sería lo obvio y está mal: destruye y recrea cada marcador,
 * lo que cierra cualquier popup abierto y aborta un arrastre en curso. Es la misma razón por
 * la que un movimiento correcto tampoco re-renderiza.
 */
function rescalePins(L: typeof import('leaflet')) {
  if (!map) return
  const size = currentPinSize()
  for (const { marker, pin } of markerPins) {
    const [w, h] = markerIconSize(pin, size)
    marker.setIcon(
      L.divIcon({
        className: 'custom-pin',
        html: buildPinMarkerHtml(pin, size),
        iconSize: [w, h],
        iconAnchor: [w / 2, h / 2],
      }),
    )
  }
}

/**
 * Centra y acerca el mapa sobre un pin. Lo usa la lista de pines de debajo del mapa al
 * pinchar en un nombre. Expuesto con `defineExpose` en lugar de por prop, porque es una
 * ACCIÓN puntual y no un estado: una prop obligaría a inventar un "pin enfocado" que hay que
 * limpiar después para poder volver a enfocar el mismo.
 */
function focusPin(pinId: string) {
  if (!map) return
  const entry = markerPins.find((m) => m.pin.id === pinId)
  if (!entry) return
  const target = entry.marker.getLatLng()
  // Un zoom cercano al máximo, que es lo que se pide al pinchar un nombre: "llévame ahí".
  // Se respeta el techo del mapa, que en un mapa de imagen no es 19.
  const maxZoom = map.getMaxZoom() ?? 19
  map.setView(target, Math.max(map.getZoom(), Math.min(maxZoom, maxZoom - 2)), { animate: true })
  entry.marker.openPopup()
}

defineExpose({ focusPin })

function renderPins(L: typeof import('leaflet')) {
  if (!map || !props.pins) return

  markers.forEach((m) => m.remove())
  markers = []
  markerPins = []

  for (const pin of props.pins) {
    if (pin.groupId && groupVisibility[pin.groupId] === false) continue

    const size = currentPinSize()
    const [iconWidth, iconHeight] = markerIconSize(pin, size)
    const divIcon = L.divIcon({
      className: 'custom-pin',
      html: buildPinMarkerHtml(pin, size),
      iconSize: [iconWidth, iconHeight],
      iconAnchor: [iconWidth / 2, iconHeight / 2],
    })

    const [lat, lng] = pinToLeafletLatLng(pin, mapType.value, props.imageWidth, props.imageHeight)
    // Draggable gated on the same role check the drop handler uses (design.md D1) -- the
    // server remains the authority on the PATCH itself, this only offers/withholds the
    // affordance.
    const canDrag = !!props.canCreatePins
    const marker = L.marker([lat, lng], { icon: divIcon, draggable: canDrag }).addTo(map)

    if (canDrag) {
      let dragStartLatLng: LeafletLatLng | null = null
      marker.on('dragstart', () => {
        dragStartLatLng = marker.getLatLng()
      })
      marker.on('dragend', () => {
        const newLatLng = marker.getLatLng()
        // design.md Risks: `dragend` can fire on a click with no real movement -- skip the
        // request entirely rather than send a harmless-but-noisy no-op PATCH.
        if (dragStartLatLng && newLatLng.equals(dragStartLatLng)) return

        const previousLatLng: [number, number] = dragStartLatLng
          ? [dragStartLatLng.lat, dragStartLatLng.lng]
          : [lat, lng]
        const converted = leafletLatLngToPin(
          newLatLng,
          mapType.value,
          props.imageWidth,
          props.imageHeight,
        )
        // Arm the suppression BEFORE emitting: the page's handler mutates
        // `mapData.value.pins[i]` asynchronously (after the PATCH resolves), and this flag
        // must already be set by the time that mutation lands, however long the request
        // takes.
        suppressNextPinsRender = true
        emit('pinMove', {
          pinId: pin.id,
          lat: converted.lat,
          lng: converted.lng,
          previousLatLng,
          onSuccess: () => {
            /* mapData.value.pins[i] is updated by the caller -- nothing to do here (D1:
             * no re-render on success, or every marker would be destroyed and rebuilt). */
          },
          // On a rejected PATCH, put the marker back so the screen never shows a position
          // the database does not hold (design.md D1) -- renderPins won't run because
          // nothing changed in `pins`. No mutation follows a failed move, so disarm the
          // suppression rather than leave it to swallow some later, unrelated pins change.
          onError: () => {
            suppressNextPinsRender = false
            marker.setLatLng(previousLatLng)
          },
        })
      })
    }

    const canDelete = !!props.canDeletePins
    const popupContent = buildPinPopupHtml(
      pin,
      props.campaignId,
      props.popupLabels ?? DEFAULT_POPUP_LABELS,
      canDelete,
    )
    marker.bindPopup(popupContent)

    // The popup's HTML is a plain string Leaflet inserts on open -- a `@click` in that
    // string never binds (design.md's Risks), so the delete button's handler is wired here,
    // after Leaflet has actually put the DOM node in the document.
    if (canDelete) {
      marker.on('popupopen', () => {
        const popupEl = marker.getPopup()?.getElement()
        const deleteBtn = popupEl?.querySelector<HTMLButtonElement>('[data-pin-delete]')
        deleteBtn?.addEventListener('click', () => emit('pinDelete', pin.id))
      })
    }

    marker.on('click', (e) => {
      if ((e.originalEvent as MouseEvent).shiftKey && pin.childMapId) {
        emit('pinShiftClick', pin)
      } else {
        emit('pinClick', pin)
      }
    })

    markers.push(marker)
    markerPins.push({ marker, pin })
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
