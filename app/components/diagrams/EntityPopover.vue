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
import { ref, watch } from 'vue'
import { entityDetailPath } from '~/utils/entity-routes'

const props = defineProps<{
  visible: boolean
  entityId: string
  campaignId: string
  slug: string
  x: number
  y: number
}>()

const emit = defineEmits<{
  close: []
  expand: [entityId: string, entityType: string]
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

watch(
  () => [props.visible, props.slug] as const,
  async ([visible, slug]) => {
    if (visible && slug) {
      await fetchEntity(slug)
    }
  },
  { immediate: true },
)

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
