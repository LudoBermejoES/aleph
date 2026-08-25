<template>
  <form class="space-y-6" @submit.prevent="$emit('submit')">
    <div>
      <label class="text-sm font-medium">{{ $t('maps.name') }}</label>
      <input
        v-model="form.name"
        required
        class="w-full mt-1 px-3 py-2 rounded border border-input bg-background"
        :placeholder="$t('maps.namePlaceholder')"
      />
    </div>
    <div>
      <label class="text-sm font-medium">{{ $t('characters.visibility') }}</label>
      <select
        v-model="form.visibility"
        class="w-full mt-1 px-3 py-2 rounded border border-input bg-background"
      >
        <option value="members">{{ $t('characters.visibilityMembers') }}</option>
        <option value="public">{{ $t('characters.visibilityPublic') }}</option>
        <option value="dm_only">{{ $t('characters.visibilityDmOnly') }}</option>
      </select>
    </div>

    <div>
      <label class="text-sm font-medium">{{ $t('maps.type') }}</label>
      <select
        v-model="form.type"
        data-testid="map-type-select"
        class="w-full mt-1 px-3 py-2 rounded border border-input bg-background"
      >
        <option value="image">{{ $t('maps.typeImage') }}</option>
        <option value="osm">{{ $t('maps.typeOsm') }}</option>
      </select>
    </div>

    <!-- Uploaded-image map: unchanged from before OSM support existed -->
    <div v-if="form.type !== 'osm'">
      <label class="text-sm font-medium">{{ $t('maps.image') }}</label>
      <input
        ref="fileInput"
        type="file"
        accept="image/png,image/jpeg,image/webp"
        class="block w-full mt-1 text-sm border border-input rounded-md p-2 bg-background"
      />
      <p class="text-xs text-muted-foreground mt-1">{{ $t('maps.imageHint') }}</p>
    </div>

    <!-- OSM map: address search (never fired per keystroke, design.md D3) + direct coordinates -->
    <div v-else class="space-y-4 rounded-lg border border-border p-4">
      <div>
        <label class="text-sm font-medium">{{ $t('maps.address') }}</label>
        <div class="flex gap-2 mt-1">
          <input
            v-model="addressQuery"
            data-testid="map-address-input"
            class="flex-1 px-3 py-2 rounded border border-input bg-background"
            :placeholder="$t('maps.addressPlaceholder')"
            @keydown.enter.prevent="searchAddress"
          />
          <Button
            type="button"
            variant="outline"
            data-testid="map-address-search-btn"
            :disabled="geocoding || !addressQuery.trim()"
            @click="searchAddress"
          >
            {{ geocoding ? $t('maps.searching') : $t('maps.search') }}
          </Button>
        </div>
        <p v-if="geocodeError" class="text-xs text-destructive mt-1">{{ geocodeError }}</p>
      </div>

      <div v-if="candidates.length" data-testid="map-geocode-results">
        <p class="text-xs font-semibold text-muted-foreground mb-1">
          {{ $t('maps.geocodeResults') }}
        </p>
        <ul class="space-y-1">
          <li v-for="(candidate, i) in candidates" :key="i">
            <button
              type="button"
              class="w-full text-left text-sm px-3 py-2 rounded border border-input hover:border-primary/50"
              @click="selectCandidate(candidate)"
            >
              {{ candidate.displayName }}
              <span class="text-xs text-muted-foreground block"
                >{{ candidate.lat.toFixed(5) }}, {{ candidate.lng.toFixed(5) }}</span
              >
            </button>
          </li>
        </ul>
      </div>

      <!-- design.md D7: always show what will actually be saved before it's saved -->
      <div
        v-if="form.centerLat != null && form.centerLng != null"
        data-testid="map-selected-location"
        class="text-sm rounded bg-muted px-3 py-2"
      >
        <strong>{{ $t('maps.selectedLocation') }}:</strong>
        {{ form.centerLat.toFixed(5) }}, {{ form.centerLng.toFixed(5) }}
      </div>

      <details>
        <summary class="text-xs text-muted-foreground cursor-pointer">
          {{ $t('maps.useCoordinatesDirectly') }}
        </summary>
        <div class="grid grid-cols-2 gap-2 mt-2">
          <div>
            <label class="text-xs text-muted-foreground">{{ $t('maps.centerLat') }}</label>
            <input
              v-model.number="form.centerLat"
              type="number"
              step="any"
              min="-90"
              max="90"
              data-testid="map-center-lat-input"
              class="w-full mt-1 px-3 py-2 rounded border border-input bg-background"
            />
          </div>
          <div>
            <label class="text-xs text-muted-foreground">{{ $t('maps.centerLng') }}</label>
            <input
              v-model.number="form.centerLng"
              type="number"
              step="any"
              min="-180"
              max="180"
              data-testid="map-center-lng-input"
              class="w-full mt-1 px-3 py-2 rounded border border-input bg-background"
            />
          </div>
        </div>
      </details>

      <div>
        <label class="text-xs text-muted-foreground">{{ $t('maps.zoom') }}</label>
        <input
          v-model.number="form.defaultZoom"
          type="number"
          min="0"
          max="19"
          data-testid="map-zoom-input"
          class="w-full mt-1 px-3 py-2 rounded border border-input bg-background"
        />
      </div>
    </div>

    <div class="flex justify-end gap-2">
      <slot name="cancel"></slot>
      <Button type="submit" :disabled="submitting">{{
        submitting ? $t('common.saving') : submitLabel
      }}</Button>
    </div>
  </form>
</template>

<script setup lang="ts">
export interface MapFormModel {
  name: string
  visibility: string
  type?: 'image' | 'osm'
  centerLat?: number | null
  centerLng?: number | null
  defaultZoom?: number | null
}

interface GeocodeCandidate {
  displayName: string
  lat: number
  lng: number
}

const props = defineProps<{
  modelValue: MapFormModel
  /** Needed to call the server-side geocoding endpoint (design.md D3). */
  campaignId?: string
  submitLabel?: string
  submitting?: boolean
}>()

defineEmits<{ 'update:modelValue': [value: typeof props.modelValue]; submit: [] }>()

const { t } = useI18n()
const fileInput = ref<HTMLInputElement>()
const addressQuery = ref('')
const candidates = ref<GeocodeCandidate[]>([])
const geocoding = ref(false)
const geocodeError = ref('')

const form = computed({
  get: () => props.modelValue,
  set: (_val) => {},
})

// Default to 'image' for a brand-new form so the type selector always has a real value.
if (form.value.type === undefined) form.value.type = 'image'

async function searchAddress() {
  if (!props.campaignId || !addressQuery.value.trim()) return
  geocoding.value = true
  geocodeError.value = ''
  candidates.value = []
  try {
    const api = useMapApi(props.campaignId)
    const { candidates: results } = await api.geocodeAddress(addressQuery.value.trim())
    candidates.value = results
    if (!results.length) {
      geocodeError.value = t('maps.geocodeNoResults')
    }
  } catch {
    geocodeError.value = t('maps.geocodeError')
  } finally {
    geocoding.value = false
  }
}

function selectCandidate(candidate: GeocodeCandidate) {
  form.value.centerLat = candidate.lat
  form.value.centerLng = candidate.lng
  candidates.value = []
}

defineExpose({ fileInput })
</script>
