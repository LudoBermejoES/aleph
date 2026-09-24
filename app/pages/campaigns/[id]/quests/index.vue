<template>
  <div class="p-8">
    <div class="flex items-center gap-2 text-sm text-muted-foreground mb-1">
      <NuxtLink :to="`/campaigns/${campaignId}`" class="hover:text-primary">
        {{ $t('common.campaign') }}</NuxtLink
      >
      <span>/</span>
      <span>{{ $t('quests.title') }}</span>
    </div>

    <div class="flex items-center justify-between mb-6 flex-wrap gap-y-2">
      <h1 class="text-2xl font-bold">{{ $t('quests.title') }}</h1>
      <NuxtLink :to="`/campaigns/${campaignId}/quests/new`">
        <Button data-testid="new-quest-btn">{{ $t('quests.new') }}</Button>
      </NuxtLink>
    </div>

    <!-- Sub-campaign chips, mirroring the sessions list. They COMPOSE with the status filter
         below rather than replacing it: the endpoint ANDs both predicates. -->
    <div v-if="subCampaigns.length > 1" class="flex gap-2 mb-3 flex-wrap">
      <button
        :class="[
          'flex items-center gap-2 px-3 py-1.5 rounded-full text-sm border transition-colors',
          activeSubCampaignSlug === null
            ? 'bg-primary text-primary-foreground border-primary'
            : 'border-border hover:border-primary/50',
        ]"
        @click="setSubCampaign(null)"
      >
        {{ $t('sessions.allSubCampaigns') }}
      </button>
      <button
        v-for="sc in subCampaigns"
        :key="sc.id"
        :class="[
          'flex items-center gap-2 px-3 py-1.5 rounded-full text-sm border transition-colors',
          activeSubCampaignSlug === sc.slug
            ? 'bg-primary text-primary-foreground border-primary'
            : 'border-border hover:border-primary/50',
        ]"
        @click="setSubCampaign(sc.slug)"
      >
        <img
          v-if="sc.imageUrl"
          :src="sc.imageUrl"
          :alt="sc.name"
          class="w-4 h-4 rounded-full object-cover"
        />
        {{ sc.name }}
      </button>
    </div>

    <div class="flex gap-2 mb-6">
      <Button :variant="filter === '' ? 'default' : 'outline'" size="sm" @click="setFilter('')">{{
        $t('characters.all')
      }}</Button>
      <Button
        :variant="filter === 'active' ? 'default' : 'outline'"
        size="sm"
        @click="setFilter('active')"
        >{{ $t('quests.active') }}</Button
      >
      <Button
        :variant="filter === 'completed' ? 'default' : 'outline'"
        size="sm"
        @click="setFilter('completed')"
        >{{ $t('quests.completed') }}</Button
      >
    </div>

    <LoadingSkeleton v-if="loading" :rows="4" />
    <div v-else-if="questList.length" class="space-y-2">
      <div v-for="q in rootQuests" :key="q.id" class="space-y-1">
        <div class="p-3 rounded-lg border border-border">
          <div class="flex items-center justify-between">
            <NuxtLink
              :to="`/campaigns/${campaignId}/quests/${q.slug}`"
              class="font-medium hover:text-primary"
              >{{ q.name }}</NuxtLink
            >
            <span
              :class="[
                'inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded',
                q.status === 'active'
                  ? 'bg-blue-100 text-blue-700'
                  : q.status === 'completed'
                    ? 'bg-green-100 text-green-700'
                    : q.status === 'failed'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-secondary text-secondary-foreground',
              ]"
            >
              <component
                :is="
                  q.status === 'active'
                    ? ICONS.questActive
                    : q.status === 'completed'
                      ? ICONS.questCompleted
                      : q.status === 'failed'
                        ? ICONS.questFailed
                        : ICONS.questAbandoned
                "
                class="w-3 h-3"
              />
              {{ questStatusLabel(q.status) }}
            </span>
          </div>
          <!-- TWO BRANCHES, AND THE DIFFERENT CLASSES ARE THE POINT (design D4).
               1. A hand-written short description is shown WHOLE: no truncation, no ellipsis and
                  deliberately NO `line-clamp`. It is capped at 200 chars server-side, so it always
                  fits -- clamping it "just in case" would trim it at narrow widths and quietly
                  void the promise the field exists to make.
               2. Otherwise we fall back to a flattened excerpt of the long markdown description,
                  which has no guaranteed length and therefore IS clamped. Raw interpolation here
                  would print `**` literally and let HTML collapse every newline.
               Reordering or merging these two is how this screen regresses. -->
          <p v-if="q.shortDescription" class="text-sm text-muted-foreground mt-1 break-words">
            {{ q.shortDescription }}
          </p>
          <p
            v-else-if="questExcerpt(q.description)"
            class="text-sm text-muted-foreground mt-1 line-clamp-2"
          >
            {{ questExcerpt(q.description) }}
          </p>
        </div>
        <!-- Sub-quests -->
        <div
          v-for="sub in childQuests(q.id)"
          :key="sub.id"
          class="ml-6 p-2 rounded border border-border/50 text-sm"
        >
          <NuxtLink
            :to="`/campaigns/${campaignId}/quests/${sub.slug}`"
            class="hover:text-primary"
            >{{ sub.name }}</NuxtLink
          >
          <span
            :class="[
              'inline-flex items-center gap-1 text-xs ml-2 px-1.5 py-0.5 rounded',
              sub.status === 'active'
                ? 'bg-blue-50 text-blue-600'
                : 'bg-secondary text-secondary-foreground',
            ]"
          >
            <component
              :is="
                sub.status === 'active'
                  ? ICONS.questActive
                  : sub.status === 'completed'
                    ? ICONS.questCompleted
                    : sub.status === 'failed'
                      ? ICONS.questFailed
                      : ICONS.questAbandoned
              "
              class="w-3 h-3"
            />{{ questStatusLabel(sub.status) }}</span
          >
        </div>
      </div>
    </div>
    <EmptyState
      v-else
      icon="⚔️"
      :title="$t('quests.empty')"
      :description="$t('quests.emptyDescription')"
    />
    <ErrorToast v-if="error" :message="error" @dismiss="dismissError" />
  </div>
</template>

<script setup lang="ts">
import { ICONS } from '~/utils/icons'
import type { Quest } from '~/types/api'
import { buildExcerpt } from '#shared/utils/text-excerpt'

// 240 chars is about two lines at this card width, which is what `line-clamp-2` shows anyway --
// excerpting to roughly the visible length keeps the DOM honest instead of clipping a 2,900-char
// string with CSS and leaving the rest for a text search to find.
const questExcerpt = (description: string | null) =>
  description ? buildExcerpt(description, 240) : ''
const { t } = useI18n()
const route = useRoute()
const campaignId = route.params.id as string

// Translate a quest status value to its localized label, falling back to the raw value.
function questStatusLabel(status?: string | null): string {
  if (!status) return ''
  const key = `quests.status${status.charAt(0).toUpperCase()}${status.slice(1)}`
  return t(key, status)
}

const questList = ref<Quest[]>([])
const filter = ref('')
interface SubCampaignRow {
  id: string
  slug: string
  name: string
  isDefault: boolean
  imageUrl?: string | null
}
const subCampaigns = ref<SubCampaignRow[]>([])
const activeSubCampaignSlug = ref<string | null>(null)
const api = useCampaignApi(campaignId)
const { loading, error, withLoading, dismissError } = useLoadingState()

const rootQuests = computed(() => questList.value.filter((q) => !q.parentQuestId))
function childQuests(parentId: string) {
  return questList.value.filter((q) => q.parentQuestId === parentId)
}

function setFilter(value: string) {
  filter.value = value
  load()
}

// Changing one filter must not clear the other: both live in their own ref and both go into the
// same query string.
function setSubCampaign(slug: string | null) {
  activeSubCampaignSlug.value = slug
  load()
}

async function load() {
  await withLoading(async () => {
    const params: Record<string, string> = {}
    if (filter.value) params.status = filter.value
    if (activeSubCampaignSlug.value) params.subCampaignSlug = activeSubCampaignSlug.value
    const [quests, subs] = await Promise.all([
      api.getQuests(params),
      $fetch<SubCampaignRow[]>(`/api/campaigns/${campaignId}/sub-campaigns`),
    ])
    questList.value = quests
    subCampaigns.value = subs
  })
}

onMounted(load)
</script>
