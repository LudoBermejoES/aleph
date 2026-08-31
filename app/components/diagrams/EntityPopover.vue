<template>
  <!-- `bg-popover text-popover-foreground` is the token pair, as in
       ui/dropdown-menu/DropdownMenuContent.vue. This was previously the only
       literal-white surface in the app, which mixed an unthemed background with
       the themed foreground tokens used inside it: the summary and tags below
       (`text-muted-foreground`) landed at 2.32:1 under mage-ascension. -->
  <div
    v-if="visible"
    ref="popoverRef"
    class="absolute z-50 bg-popover text-popover-foreground rounded-lg shadow-xl border border-border p-4 w-72"
    :style="{ left: x + 'px', top: y + 'px' }"
    data-testid="entity-popover"
  >
    <!-- Loading state -->
    <div v-if="loading" class="text-sm text-muted-foreground py-2 text-center">
      {{ $t('common.loading') }}
    </div>

    <!-- Error state -->
    <div v-else-if="error" class="text-sm text-destructive py-2 text-center">
      {{ $t('common.error') }}
    </div>

    <!-- Content -->
    <template v-else-if="entity">
      <div class="flex gap-3 mb-3">
        <!-- Portrait -->
        <div class="shrink-0">
          <img
            v-if="entity.portraitUrl || entity.imageUrl"
            :src="entity.portraitUrl || entity.imageUrl"
            :alt="entity.name"
            class="w-14 h-14 rounded object-cover border border-border"
          />
          <div
            v-else
            class="w-14 h-14 rounded bg-muted flex items-center justify-center text-xl border border-border"
          >
            {{ entity.name?.charAt(0)?.toUpperCase() ?? '?' }}
          </div>
        </div>

        <!-- Name + type -->
        <div class="flex-1 min-w-0">
          <div class="font-semibold text-sm truncate">{{ entity.name }}</div>
          <span
            class="inline-block text-xs font-medium px-2 py-0.5 rounded-full mt-1"
            :class="typeColor(entity.type)"
          >
            {{ $t(`entities.types.${entity.type}`, entity.type) }}
          </span>
        </div>

        <!-- Close button -->
        <button
          class="shrink-0 p-1 rounded hover:bg-accent transition-colors self-start"
          data-testid="entity-popover-close"
          @click="$emit('close')"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="w-3.5 h-3.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Content preview -->
      <div
        v-if="entity.boardSummary"
        class="text-xs text-muted-foreground line-clamp-3 mb-3 leading-relaxed"
      >
        {{ entity.boardSummary }}
      </div>

      <!-- Tags -->
      <div v-if="entity.tags && entity.tags.length > 0" class="flex flex-wrap gap-1 mb-3">
        <span
          v-for="tag in entity.tags"
          :key="tag.id ?? tag.name ?? tag"
          class="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground"
        >
          {{ tag.name ?? tag }}
        </span>
      </div>

      <!-- Per-shape image picker (this card only).
           Shown only when there is a real choice to make: a DM on a writable
           diagram, a shape that renders an entity image, and at least two
           images. One image or none offers nothing to switch to, and an empty
           control that does nothing is the defect this repo keeps repeating. -->
      <div v-if="showImagePicker" class="mb-3" data-testid="entity-popover-image-picker">
        <div class="flex items-center justify-between mb-1">
          <span class="text-xs font-medium text-muted-foreground">{{
            $t('diagrams.popover.cardImage')
          }}</span>
          <button
            v-if="currentImageId"
            type="button"
            class="text-xs text-primary hover:underline"
            data-testid="entity-popover-image-reset"
            @click="chooseImage(null)"
          >
            {{ $t('diagrams.popover.useMainImage') }}
          </button>
        </div>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="(image, index) in galleryImages"
            :key="image.id"
            type="button"
            class="relative rounded border-2 overflow-hidden transition-colors"
            :class="
              image.id === shownImageId
                ? 'border-primary'
                : 'border-border hover:border-muted-foreground'
            "
            :aria-label="$t('diagrams.popover.useImage', { index: index + 1 })"
            :aria-pressed="image.id === shownImageId"
            data-testid="entity-popover-image-option"
            :data-image-id="image.id"
            :data-selected="image.id === shownImageId ? 'true' : 'false'"
            @click="chooseImage(image.id)"
          >
            <img
              :src="image.url"
              :alt="$t('diagrams.popover.useImage', { index: index + 1 })"
              class="w-12 h-12 object-cover"
            />
          </button>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex gap-2">
        <Button size="sm" class="flex-1" data-testid="entity-popover-open" @click="openFullPage">
          {{ $t('diagrams.popover.openFullPage') }}
        </Button>
        <Button
          v-if="
            entity.type === 'organization' ||
            entity.type === 'location' ||
            entity.type === 'character'
          "
          size="sm"
          variant="outline"
          data-testid="entity-popover-expand"
          @click="$emit('expand', entity.id, entity.type)"
        >
          {{ $t('diagrams.expand') }}
        </Button>
        <Button
          size="sm"
          variant="outline"
          data-testid="entity-popover-new-tab"
          @click="openNewTab"
        >
          ↗
        </Button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { entityDetailPath } from '~/utils/entity-routes'
import { resolveShownImageId } from '~/utils/diagram-hydration'

const props = defineProps<{
  visible: boolean
  entityId: string
  campaignId: string
  slug: string
  x: number
  y: number
  /** The shape that raised the preview. One entity can be placed many times, so
   *  without it the picker could only address "some" card (design D4). */
  shapeId?: string
  /** The image this particular shape currently overrides to, if any. */
  currentImageId?: string | null
  /** Explicit, NOT inferred from a read-only branch upstream: this component is
   *  reachable from more than one place (design D5). */
  canPickImage?: boolean
}>()

const emit = defineEmits<{
  close: []
  expand: [entityId: string, entityType: string]
  /** The page owns the tldraw editor handle and every shape write goes through
   *  it, so the choice is emitted rather than applied here (design D4). */
  selectImage: [shapeId: string, imageId: string | null, imageUrl: string | undefined]
}>()

const router = useRouter()

interface EntityDetail {
  id: string
  name: string
  type: string
  slug: string
  boardSummary?: string
  portraitUrl?: string
  imageUrl?: string
  tags?: Array<{ id?: string; name?: string } | string>
}

const entity = ref<EntityDetail | null>(null)
const loading = ref(false)
const error = ref(false)
const popoverRef = ref<HTMLDivElement | null>(null)

interface GalleryImageRef {
  id: string
  url: string
}

const galleryImages = ref<GalleryImageRef[]>([])
const primaryImageUrl = ref<string | undefined>(undefined)

/**
 * Which thumbnail is marked. NOT `currentImageId`: that is the shape's override and
 * it is null in the state every card starts in — no override, showing the entity's
 * primary — so marking it left the picker with zero options marked in the only state
 * a reader ever sees first. The spec requires the gallery to be offered "with the one
 * currently shown marked", so this resolves the SHOWN image by the same rule
 * hydration uses, and it reads `primaryImageUrl` from the `batch` response the picker
 * already has: no extra request.
 *
 * Marking is a read. It never stores an override -- see `chooseImage`.
 */
const shownImageId = computed(() =>
  resolveShownImageId(
    galleryImages.value,
    primaryImageUrl.value,
    props.currentImageId ?? undefined,
  ),
)

// A picker with one option (or none) offers nothing: hide it rather than render
// a control that cannot change anything.
const showImagePicker = computed(
  () => Boolean(props.canPickImage) && Boolean(props.shapeId) && galleryImages.value.length > 1,
)

watch(
  () => [props.visible, props.slug] as const,
  async ([visible, slug]) => {
    if (visible && slug) {
      await fetchEntity(slug)
    }
  },
  { immediate: true },
)

watch(
  () => [props.visible, props.entityId] as const,
  async ([visible, entityId]) => {
    galleryImages.value = []
    primaryImageUrl.value = undefined
    if (!visible || !entityId) return
    await fetchGallery(entityId)
  },
  { immediate: true },
)

/**
 * The gallery comes from the SAME endpoint hydration reads, so the picker's
 * choices and the resolved image can never disagree, and the `dm_only`
 * visibility rule is applied in exactly one place (design D3).
 *
 * `images` is optional in the response: without it there is no picker and the
 * card keeps showing the primary.
 */
async function fetchGallery(entityId: string) {
  try {
    const batch = await $fetch<
      Record<string, { portraitUrl?: string | null; images?: GalleryImageRef[] | null }>
    >(`/api/campaigns/${props.campaignId}/diagrams/entities/batch`, { query: { ids: entityId } })
    const data = batch?.[entityId]
    galleryImages.value = (data?.images ?? []).filter((i) => i && i.id && i.url)
    primaryImageUrl.value = data?.portraitUrl ?? undefined
  } catch {
    galleryImages.value = []
    primaryImageUrl.value = undefined
  }
}

function chooseImage(imageId: string | null) {
  if (!props.shapeId) return
  // Clicking what the card is ALREADY showing writes nothing. Without the second
  // line, clicking the (now correctly marked) primary thumbnail on a card with no
  // override would store an override pinning that image, and the card would stop
  // following the entity's main image for ever -- worse than the missing mark.
  if (imageId === null && !props.currentImageId) return
  if (imageId !== null && imageId === shownImageId.value) return
  const url =
    imageId === null
      ? primaryImageUrl.value
      : galleryImages.value.find((i) => i.id === imageId)?.url
  emit('selectImage', props.shapeId, imageId, url)
}

async function fetchEntity(slug: string) {
  loading.value = true
  error.value = false
  entity.value = null
  try {
    entity.value = await $fetch<EntityDetail>(`/api/campaigns/${props.campaignId}/entities/${slug}`)
  } catch {
    // Entity not found — may be an organization (not in entities table)
    try {
      const org = await $fetch<{ id: string; name: string; slug: string; description?: string }>(
        `/api/campaigns/${props.campaignId}/organizations/${slug}`,
      )
      entity.value = {
        id: org.id,
        name: org.name,
        type: 'organization',
        slug: org.slug,
        boardSummary: org.description ?? undefined,
      }
    } catch {
      error.value = true
    }
  } finally {
    loading.value = false
  }
}

function entityUrl() {
  if (!entity.value) return ''
  const { type, slug } = entity.value
  return entityDetailPath(props.campaignId, type, slug)
}

function openFullPage() {
  emit('close')
  router.push(entityUrl())
}

function openNewTab() {
  window.open(entityUrl(), '_blank')
}

function typeColor(type: string) {
  const map: Record<string, string> = {
    character: 'bg-purple-100 text-purple-700',
    location: 'bg-amber-100 text-amber-700',
    organization: 'bg-blue-100 text-blue-700',
    quest: 'bg-green-100 text-green-700',
  }
  return map[type] ?? 'bg-muted text-muted-foreground'
}
</script>
