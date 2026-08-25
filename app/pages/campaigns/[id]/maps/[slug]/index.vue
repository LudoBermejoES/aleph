<template>
  <div class="p-8">
    <LoadingSkeleton v-if="loading" :rows="3" />
    <ErrorToast v-if="error" :message="error" @dismiss="error = null" />
    <div v-else-if="mapData">
      <!-- Breadcrumb -->
      <div class="flex items-center gap-2 text-sm text-muted-foreground mb-4">
        <NuxtLink :to="`/campaigns/${campaignId}`" class="hover:text-primary">
          {{ $t('common.campaign') }}</NuxtLink
        >
        <span>/</span>
        <NuxtLink :to="`/campaigns/${campaignId}/maps`" class="hover:text-primary">{{
          $t('maps.title')
        }}</NuxtLink>
        <template v-for="(crumb, i) in mapData.breadcrumb" :key="crumb.id">
          <span>/</span>
          <NuxtLink
            v-if="i < mapData.breadcrumb.length - 1"
            :to="`/campaigns/${campaignId}/maps/${crumb.slug}`"
            class="hover:text-primary"
            >{{ crumb.name }}</NuxtLink
          >
          <span v-else class="text-foreground">{{ crumb.name }}</span>
        </template>
      </div>

      <div class="flex items-start justify-between mb-6 flex-wrap gap-y-2">
        <h1 class="text-2xl font-bold">{{ mapData.name }}</h1>
        <div class="flex items-center gap-2">
          <NuxtLink :to="`/campaigns/${campaignId}/maps/${slug}/edit`">
            <Button variant="outline" size="sm">{{ $t('common.edit') }}</Button>
          </NuxtLink>
          <Button v-if="isDm" variant="destructive" size="sm" @click="confirmDelete">{{
            $t('common.delete')
          }}</Button>
          <span
            v-if="mapData.type === 'image' && mapData.width"
            class="text-sm text-muted-foreground"
            >{{ mapData.width }}x{{ mapData.height }}px</span
          >
        </div>
      </div>

      <div class="flex gap-4 items-start flex-wrap lg:flex-nowrap">
        <!-- Leaflet Map Viewer -->
        <div class="flex-1 min-w-0 w-full">
          <ClientOnly>
            <MapViewer
              :map-type="mapData.type"
              :image-path="mapData.imagePath"
              :image-width="mapData.width || 1024"
              :image-height="mapData.height || 768"
              :center-lat="mapData.centerLat"
              :center-lng="mapData.centerLng"
              :default-zoom="mapData.defaultZoom"
              :attribution="mapData.type === 'osm' ? osmAttribution : undefined"
              :pins="mapData.pins"
              :layers="mapData.layers"
              :groups="mapData.groups"
              :regions="mapData.regions"
              :is-tiled="mapData.isTiled"
              :tile-url="tileUrl"
              :campaign-id="campaignId"
              :can-create-pins="isEditorPlus"
              :can-delete-pins="isEditorPlus"
              :popup-labels="popupLabels"
              :height="600"
              @pin-click="onPinClick"
              @pin-shift-click="onPinShiftClick"
              @region-created="onRegionCreated"
              @pin-drop="onPinDrop"
              @pin-delete="deletePin"
            />
          </ClientOnly>
        </div>

        <!-- Entity picker: drag-and-drop source for creating pins (design.md D6) -->
        <div
          v-if="isEditorPlus"
          data-testid="map-entities-panel"
          class="w-full lg:w-72 shrink-0 border border-border rounded-lg p-3 max-h-[600px] overflow-y-auto"
        >
          <p class="text-sm font-semibold mb-1">{{ $t('maps.entitiesPanel') }}</p>
          <p class="text-xs text-muted-foreground mb-3">{{ $t('maps.entitiesPanelHint') }}</p>

          <div class="flex flex-col gap-2 mb-3">
            <select
              v-model="entityFilters.type"
              class="rounded-md border border-input bg-background px-2 py-1 text-xs"
              @change="loadEntities"
            >
              <option value="">{{ $t('entities.allTypes') }}</option>
              <option v-for="et in entityTypes" :key="et.slug" :value="et.slug">
                {{ et.name }}
              </option>
            </select>
            <input
              v-model="entityFilters.search"
              :placeholder="$t('maps.filterEntities')"
              class="rounded-md border border-input bg-background px-2 py-1 text-xs"
              @input="debouncedLoadEntities"
            />
          </div>

          <ul class="space-y-1">
            <li
              v-for="entity in pickerEntities"
              :key="entity.id"
              draggable="true"
              :title="t('maps.dragHint')"
              class="text-xs px-2 py-1.5 rounded border border-border cursor-grab hover:border-primary/50 flex items-center justify-between gap-2"
              @dragstart="onEntityDragStart(entity, $event)"
            >
              <span class="truncate">{{ entity.name }}</span>
              <span class="text-[10px] text-muted-foreground shrink-0">{{ entity.type }}</span>
            </li>
          </ul>
          <p v-if="!pickerEntities.length" class="text-xs text-muted-foreground">
            {{ $t('entities.empty') }}
          </p>
        </div>
      </div>

      <!-- Pins List -->
      <div v-if="mapData.pins?.length" class="mt-6">
        <h2 class="text-lg font-semibold mb-3">{{ $t('maps.pins') }}</h2>
        <div class="space-y-1">
          <div
            v-for="pin in mapData.pins"
            :key="pin.id"
            class="p-2 rounded border border-border flex items-center gap-3"
          >
            <span
              v-if="pin.color"
              :style="{ backgroundColor: pin.color }"
              class="w-3 h-3 rounded-full"
            ></span>
            <span class="text-sm">{{ pin.label || $t('maps.unnamedPin') }}</span>
            <span class="text-xs text-muted-foreground"
              >({{ pin.lat.toFixed(1) }}, {{ pin.lng.toFixed(1) }})</span
            >
            <Button
              v-if="isEditorPlus"
              variant="ghost"
              size="sm"
              class="ml-auto text-destructive"
              @click="deletePin(pin.id)"
              >{{ $t('maps.deletePin') }}</Button
            >
          </div>
        </div>
      </div>

      <!-- Layers -->
      <div v-if="mapData.layers?.length" class="mt-6">
        <h2 class="text-lg font-semibold mb-3">{{ $t('maps.layers') }}</h2>
        <div class="space-y-1">
          <div
            v-for="layer in mapData.layers"
            :key="layer.id"
            class="p-2 rounded border border-border flex items-center justify-between"
          >
            <span class="text-sm">{{ layer.name }}</span>
            <span class="text-xs text-muted-foreground"
              >{{ layer.type }} ({{ Math.round(layer.opacity * 100) }}%)</span
            >
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CampaignMap, Entity, EntityType } from '~/types/api'
import { ENTITY_DRAG_MIME } from '~/utils/mapPinGeometry'

const route = useRoute()
const router = useRouter()
const campaignId = route.params.id as string
const slug = route.params.slug as string
const { t } = useI18n()
const runtimeConfig = useRuntimeConfig()

const mapData = ref<CampaignMap | null>(null)
const campaignRole = ref('')
const isDm = computed(() => ['dm', 'co_dm'].includes(campaignRole.value))
// Same role gate as the server's POST .../pins (editor+) -- the server remains the source
// of truth (design.md D6); this only decides whether the drag affordance is offered at all.
const isEditorPlus = computed(() => ['dm', 'co_dm', 'editor'].includes(campaignRole.value))
const api = useCampaignApi(campaignId)
const { loading, error, withLoading } = useLoadingState()

const tileUrl = computed(() =>
  mapData.value?.type === 'osm'
    ? (runtimeConfig.public.osmTileUrl as string)
    : `/api/campaigns/${campaignId}/maps/${slug}/tiles/{z}/{x}/{y}`,
)
const osmAttribution = runtimeConfig.public.osmAttribution as string

// ─── Entity picker (drag-and-drop pin creation, design.md D6) ─────────────────

const entityTypes = ref<EntityType[]>([])
const pickerEntities = ref<Entity[]>([])
const entityFilters = reactive({ type: '', search: '' })

let searchTimeout: ReturnType<typeof setTimeout>
function debouncedLoadEntities() {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(loadEntities, 300)
}

async function loadEntities() {
  const params: Record<string, string | number> = { page: 1, limit: 100 }
  if (entityFilters.type) params.type = entityFilters.type
  if (entityFilters.search) params.search = entityFilters.search
  const result = await api.getEntities(params).catch(() => null)
  pickerEntities.value = result?.entities ?? []
}

function onEntityDragStart(entity: Entity, event: DragEvent) {
  event.dataTransfer?.setData(ENTITY_DRAG_MIME, entity.id)
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'copy'
}

async function onPinDrop(payload: { lat: number; lng: number; entityId: string }) {
  try {
    // Label the pin with the dragged entity's own name so it's identifiable in the pins
    // list/tooltip immediately -- the drop payload only carries lat/lng/entityId.
    const label = pickerEntities.value.find((e) => e.id === payload.entityId)?.name
    const created = await api.createMapPin(slug, {
      lat: payload.lat,
      lng: payload.lng,
      entityId: payload.entityId,
      label,
    })
    // design.md D1: append the created row instead of calling load() -- load() refetches the
    // map AND the campaign inside withLoading, which unmounts MapViewer (its onUnmounted runs
    // map.remove()) and rebuilds Leaflet from scratch, snapping the viewport back to the
    // map's default centre/zoom. The POST now returns the same shape the GET endpoints do
    // (entityImageUrl/entityType included), so the new marker renders correctly on first
    // paint with no second request.
    if (mapData.value) {
      mapData.value.pins = [...(mapData.value.pins ?? []), created]
    }
  } catch (e: unknown) {
    alert((e as { data?: { message?: string } })?.data?.message || t('maps.pinCreateFailed'))
  }
}

const popupLabels = computed(() => ({
  pinFallback: t('maps.unnamedPin'),
  viewEntity: t('maps.viewEntity'),
  exploreHint: t('maps.exploreHint'),
  deletePin: t('maps.deletePin'),
}))

/**
 * Shared by both places a pin can be deleted from (design.md D4): the marker's popup button
 * and the pins list below the map. Same rule as D1 -- remove from mapData.value.pins in
 * place, never load(), so the map is never rebuilt.
 */
async function deletePin(pinId: string) {
  if (!confirm(t('maps.confirmDeletePinMessage'))) return
  try {
    await api.deleteMapPin(slug, pinId)
    if (mapData.value) {
      mapData.value.pins = (mapData.value.pins ?? []).filter((p) => p.id !== pinId)
    }
  } catch (e: unknown) {
    alert((e as { data?: { message?: string } })?.data?.message || t('maps.pinDeleteFailed'))
  }
}

// ─── Map data ──────────────────────────────────────────────────────────────

async function load() {
  await withLoading(async () => {
    const [map, campaign] = await Promise.all([
      api.getMap(slug),
      api.getCampaign().catch(() => null),
    ])
    mapData.value = map
    campaignRole.value = campaign?.role ?? ''
  })
}

function onPinClick(_pin: { id: string; childMapId?: string | null }) {
  // Pin click opens popup (handled by Leaflet)
}

function onPinShiftClick(pin: { id: string; childMapId?: string | null }) {
  if (pin.childMapId) {
    navigateTo(`/campaigns/${campaignId}/maps/${pin.childMapId}`)
  }
}

async function onRegionCreated(geojson: Record<string, unknown>) {
  try {
    await api.updateMapRegions(slug, { geojson, name: 'New Region' })
  } catch (e: unknown) {
    alert((e as { data?: { message?: string } })?.data?.message || t('maps.failedSave'))
  }
}

async function confirmDelete() {
  if (!confirm(t('maps.confirmDeleteMessage'))) return
  await api.deleteMap(slug)
  router.push(`/campaigns/${campaignId}/maps`)
}

onMounted(async () => {
  await load()
  if (isEditorPlus.value) {
    api
      .getEntityTypes()
      .then((types) => (entityTypes.value = types))
      .catch(() => {})
    loadEntities()
  }
})
</script>
