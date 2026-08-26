<template>
  <!--
    Task 3.4 / spec "No placement": nothing rendered at all when there are no placements --
    no empty section title, no residual loading state. The `v-if` on the outer element covers
    both the "still loading" and the "loaded, zero results" cases, since `placements` starts
    and stays an empty array until a successful fetch replaces it.
  -->
  <section
    v-if="placements.length"
    class="mt-8 border-t border-border pt-6"
    data-testid="entity-map-placements"
  >
    <h2 class="text-lg font-semibold mb-3">{{ $t('entities.mapPlacements.title') }}</h2>
    <ul class="space-y-1">
      <li v-for="placement in placements" :key="placement.pinId">
        <NuxtLink
          :to="placementHref(placement)"
          data-testid="entity-map-placement-link"
          class="text-sm text-primary hover:underline"
        >
          {{ placement.mapName }}
          <span v-if="displayLabel(placement) !== entityName" class="text-muted-foreground">
            — {{ displayLabel(placement) }}
          </span>
        </NuxtLink>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
// show-entity-map-pins/design.md: the reverse of the map's own pin popup ("Ver entidad") --
// ONE component shared by the location, character and organization detail pages (design.md
// Risks: "three chances to diverge"), never three copies of a v-for.
import { pinDisplayName } from '~/utils/mapPinMarker'
import type { EntityMapPlacement } from '~/types/api'

const props = defineProps<{
  campaignId: string
  /**
   * The linked ENTITY's own slug -- for a location or a character this is the page's own
   * route param; for an organization it can differ from the org's own slug (design.md
   * Context) and must be `entitySlug`. `null`/`undefined` means there is no entity to look up
   * (design.md Risks: an organization's `entityId` can be null) -- nothing is fetched and
   * nothing renders.
   */
  entitySlug: string | null | undefined
  /** Fallback for `pinDisplayName`, and the value a placement's own resolved name is compared
   *  against to decide whether to show it (design.md D4: only when it DIFFERS). */
  entityName: string
}>()

const placements = ref<EntityMapPlacement[]>([])

async function load() {
  if (!props.entitySlug) {
    placements.value = []
    return
  }
  try {
    placements.value = await $fetch<EntityMapPlacement[]>(
      `/api/campaigns/${props.campaignId}/entities/${props.entitySlug}/map-pins`,
    )
  } catch {
    // A failed fetch degrades to "no placements shown" -- same as having none, never an error
    // panel on someone else's detail page.
    placements.value = []
  }
}

function displayLabel(placement: EntityMapPlacement): string {
  return pinDisplayName({ label: placement.label, entityName: props.entityName }, props.entityName)
}

function placementHref(placement: EntityMapPlacement): string {
  return `/campaigns/${props.campaignId}/maps/${placement.mapSlug}?pin=${placement.pinId}`
}

watch(() => props.entitySlug, load)
onMounted(load)
</script>
