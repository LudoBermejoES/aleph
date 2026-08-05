<template>
  <div class="p-8">
    <div class="flex items-center gap-2 text-sm text-muted-foreground mb-1">
      <NuxtLink :to="`/campaigns/${campaignId}`" class="hover:text-primary">
        {{ $t('common.campaign') }}</NuxtLink
      >
      <span>/</span>
      <span>{{ $t('sessions.title') }}</span>
    </div>

    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold">{{ $t('sessions.title') }}</h1>
      <div class="flex items-center gap-2">
        <NuxtLink v-if="canEdit" :to="`/campaigns/${campaignId}/sub-campaigns`">
          <Button variant="outline" size="sm">{{ $t('sessions.subCampaigns') }}</Button>
        </NuxtLink>
        <NuxtLink :to="`/campaigns/${campaignId}/sessions/new`">
          <Button data-testid="new-session-btn">{{ $t('sessions.new') }}</Button>
        </NuxtLink>
      </div>
    </div>

    <!-- Sub-campaign tabs -->
    <div v-if="subCampaigns.length" class="flex gap-2 mb-6 flex-wrap">
      <button
        :class="[
          'flex items-center gap-2 px-3 py-1.5 rounded-full text-sm border transition-colors',
          activeSubCampaignSlug === null
            ? 'bg-primary text-primary-foreground border-primary'
            : 'border-border hover:border-primary/50',
        ]"
        @click="activeSubCampaignSlug = null"
      >
        {{ $t('sessions.allSubCampaigns') }}
      </button>
      <button
        v-for="subCampaign in subCampaigns"
        :key="subCampaign.id"
        :class="[
          'flex items-center gap-2 px-3 py-1.5 rounded-full text-sm border transition-colors',
          activeSubCampaignSlug === subCampaign.slug
            ? 'bg-primary text-primary-foreground border-primary'
            : 'border-border hover:border-primary/50',
        ]"
        @click="activeSubCampaignSlug = subCampaign.slug"
      >
        <img
          v-if="subCampaign.imageUrl"
          :src="subCampaign.imageUrl"
          :alt="subCampaign.name"
          class="w-4 h-4 rounded-full object-cover"
        />
        {{ subCampaign.name }}
      </button>
    </div>

    <LoadingSkeleton v-if="loading" :rows="4" />

    <!-- Upcoming -->
    <div v-if="!loading && upcoming.length" class="mb-8">
      <h2 class="text-lg font-semibold mb-3">{{ $t('sessions.upcoming') }}</h2>
      <div class="space-y-2">
        <NuxtLink
          v-for="s in upcoming"
          :key="s.id"
          :to="`/campaigns/${campaignId}/sessions/${s.slug}`"
          class="block p-4 rounded-lg border border-border hover:border-primary/50 transition-colors"
        >
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="font-medium">{{ s.title }}</span>
              <span
                v-if="s.subCampaignName"
                class="text-xs px-2 py-0.5 rounded bg-secondary text-secondary-foreground"
                >{{ s.subCampaignName }}</span
              >
            </div>
            <span
              class="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
            >
              <component
                :is="s.status === 'planned' ? ICONS.sessionPlanned : ICONS.sessionActive"
                class="w-3 h-3"
              />{{ sessionStatusLabel(s.status) }}</span
            >
          </div>
          <span v-if="s.scheduledDate" class="text-xs text-muted-foreground">{{
            new Date(s.scheduledDate).toLocaleDateString()
          }}</span>
        </NuxtLink>
      </div>
    </div>

    <!-- Past -->
    <div v-if="!loading && past.length">
      <h2 class="text-lg font-semibold mb-3">{{ $t('sessions.past') }}</h2>
      <div class="space-y-2">
        <NuxtLink
          v-for="s in past"
          :key="s.id"
          :to="`/campaigns/${campaignId}/sessions/${s.slug}`"
          class="block p-4 rounded-lg border border-border hover:border-primary/50 transition-colors"
        >
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="font-medium">{{ s.title }}</span>
              <span
                v-if="s.subCampaignName"
                class="text-xs px-2 py-0.5 rounded bg-secondary text-secondary-foreground"
                >{{ s.subCampaignName }}</span
              >
            </div>
            <span
              class="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
            >
              <component
                :is="s.status === 'completed' ? ICONS.sessionCompleted : ICONS.sessionCancelled"
                class="w-3 h-3"
              />{{ sessionStatusLabel(s.status) }}</span
            >
          </div>
          <span v-if="s.scheduledDate" class="text-xs text-muted-foreground">{{
            new Date(s.scheduledDate).toLocaleDateString()
          }}</span>
        </NuxtLink>
      </div>
    </div>

    <EmptyState
      v-if="!loading && !upcoming.length && !past.length"
      icon="📋"
      :title="$t('sessions.empty')"
      :description="$t('sessions.emptyDescription')"
    />
    <ErrorToast v-if="error" :message="error" @dismiss="dismissError" />
  </div>
</template>

<script setup lang="ts">
import { ICONS } from '~/utils/icons'
import type { GameSession } from '~/types/api'
const { t } = useI18n()
const route = useRoute()
const campaignId = route.params.id as string

// Translate a session status value to its localized label (handles snake_case).
function sessionStatusLabel(status?: string | null): string {
  if (!status) return ''
  const pascal = status
    .split('_')
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join('')
  return t(`sessions.status${pascal}`, status)
}

const sessions = ref<GameSession[]>([])
const subCampaigns = ref<Record<string, unknown>[]>([])
const activeSubCampaignSlug = ref<string | null>(null)
const canEdit = ref(false)
const { loading, error, withLoading, dismissError } = useLoadingState()
const api = useCampaignApi(campaignId)

const upcoming = computed(() =>
  sessions.value.filter((s) => ['planned', 'active'].includes(s.status)),
)
const past = computed(() =>
  sessions.value.filter((s) => ['completed', 'cancelled'].includes(s.status)),
)

async function loadSessions() {
  const params: Record<string, string> = { pageSize: '0' }
  if (activeSubCampaignSlug.value) params.subCampaignSlug = activeSubCampaignSlug.value
  const res = await api.getSessions(params)
  sessions.value = Array.isArray(res) ? res : (res as { data: GameSession[] }).data
}

async function load() {
  await withLoading(async () => {
    const [campaignData, subCampaignsData] = await Promise.all([
      $fetch<{ role?: string }>(`/api/campaigns/${campaignId}`),
      api.getSubCampaigns(),
    ])
    canEdit.value = ['dm', 'co_dm', 'editor'].includes(campaignData?.role ?? '')
    subCampaigns.value = subCampaignsData
    await loadSessions()
  })
}

watch(activeSubCampaignSlug, loadSessions)
onMounted(load)
</script>
