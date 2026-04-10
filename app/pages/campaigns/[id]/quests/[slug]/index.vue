<template>
  <div class="p-8 max-w-3xl">
    <div v-if="loading" class="text-muted-foreground">{{ $t('common.loading') }}</div>
    <template v-else-if="quest">
      <!-- Breadcrumb -->
      <div class="flex items-center gap-2 text-sm text-muted-foreground mb-4 flex-wrap">
        <NuxtLink :to="`/campaigns/${campaignId}`" class="hover:text-primary">{{
          $t('common.campaign')
        }}</NuxtLink>
        <span>/</span>
        <NuxtLink :to="`/campaigns/${campaignId}/quests`" class="hover:text-primary">{{
          $t('quests.title')
        }}</NuxtLink>
        <span>/</span>
        <span>{{ quest.name }}</span>
      </div>

      <!-- Header -->
      <div class="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 class="text-2xl font-bold">{{ quest.name }}</h1>
          <span
            :class="[
              'inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded mt-1',
              statusClass,
            ]"
          >
            {{ quest.status }}
          </span>
          <span
            v-if="quest.isSecret"
            class="ml-2 inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-yellow-100 text-yellow-700"
          >
            {{ $t('quests.secret') }}
          </span>
        </div>
        <div class="flex gap-2 shrink-0">
          <NuxtLink :to="`/campaigns/${campaignId}/quests/${slug}/edit`">
            <Button variant="outline" size="sm">{{ $t('common.edit') }}</Button>
          </NuxtLink>
          <NuxtLink :to="`/campaigns/${campaignId}/quests/${slug}/edit?collab=true`">
            <Button variant="outline" size="sm">{{ $t('collaboration.collaborate') }}</Button>
          </NuxtLink>
        </div>
      </div>

      <!-- Preview Role Switcher (DM only) -->
      <PreviewRoleSwitcher
        v-if="isDm"
        :campaign-role="campaignRole"
        :campaign-id="campaignId"
        :entity-slug="slug"
        class="mb-4"
      />

      <!-- Description -->
      <div ref="contentRef" class="prose dark:prose-invert max-w-none text-foreground mb-6">
        <p v-if="quest.description" class="text-muted-foreground">{{ quest.description }}</p>
      </div>

      <!-- Secret Notes (DM only) -->
      <SecretNotes
        v-if="isDm"
        :campaign-id="campaignId"
        :entity-slug="slug"
        :campaign-role="campaignRole"
        class="mb-6"
      />

      <!-- Meta -->
      <div class="space-y-4 mb-6">
        <div v-if="parentQuest" class="flex items-center gap-2 text-sm">
          <span class="font-medium text-muted-foreground">{{ $t('quests.parentQuest') }}:</span>
          <NuxtLink
            :to="`/campaigns/${campaignId}/quests/${parentQuest.slug}`"
            class="text-primary hover:underline"
          >
            {{ parentQuest.name }}
          </NuxtLink>
        </div>

        <div v-if="quest.entityId && linkedEntity" class="flex items-center gap-2 text-sm">
          <span class="font-medium text-muted-foreground">{{ $t('quests.linkedEntity') }}:</span>
          <NuxtLink
            :to="`/campaigns/${campaignId}/entities/${linkedEntity.slug}`"
            class="text-primary hover:underline"
          >
            {{ linkedEntity.name }}
          </NuxtLink>
        </div>

        <div v-if="assignedCharacters.length" class="text-sm">
          <span class="font-medium text-muted-foreground"
            >{{ $t('quests.assignedCharacters') }}:</span
          >
          <div class="flex flex-wrap gap-2 mt-1">
            <NuxtLink
              v-for="c in assignedCharacters"
              :key="c.id"
              :to="`/campaigns/${campaignId}/characters/${c.slug}`"
              class="inline-flex items-center px-2 py-0.5 rounded-full bg-secondary text-xs hover:bg-secondary/80"
            >
              {{ c.name }}
            </NuxtLink>
          </div>
        </div>
      </div>

      <!-- Sub-quests -->
      <section v-if="subQuests.length">
        <h2 class="text-lg font-semibold mb-3">{{ $t('quests.subQuests') }}</h2>
        <div class="space-y-2">
          <div
            v-for="sub in subQuests"
            :key="sub.id"
            class="flex items-center justify-between p-3 rounded border border-border"
          >
            <NuxtLink
              :to="`/campaigns/${campaignId}/quests/${sub.slug}`"
              class="font-medium hover:text-primary"
            >
              {{ sub.name }}
            </NuxtLink>
            <span
              :class="[
                'inline-flex items-center text-xs px-2 py-0.5 rounded',
                sub.status === 'active'
                  ? 'bg-blue-100 text-blue-700'
                  : sub.status === 'completed'
                    ? 'bg-green-100 text-green-700'
                    : sub.status === 'failed'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-secondary text-secondary-foreground',
              ]"
            >
              {{ sub.status }}
            </span>
          </div>
        </div>
      </section>
    </template>
    <div v-else class="text-muted-foreground">{{ $t('common.notFound') }}</div>
  </div>
</template>

<script setup lang="ts">
import type { Quest } from '~/types/api'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const campaignId = route.params.id as string
const slug = route.params.slug as string
const api = useCampaignApi(campaignId)

const loading = ref(true)
const quest = ref<Quest | null>(null)
const allQuests = ref<Quest[]>([])
const allCharacters = ref<{ id: string; name: string; slug: string }[]>([])
const linkedEntity = ref<{ id: string; name: string; slug: string } | null>(null)
const campaignRole = ref<string>('')
const isDm = computed(() => ['dm', 'co_dm'].includes(campaignRole.value))
const contentRef = ref<HTMLElement>()

const parentQuest = computed(() =>
  quest.value?.parentQuestId
    ? (allQuests.value.find((q) => q.id === quest.value!.parentQuestId) ?? null)
    : null,
)

const subQuests = computed(() => allQuests.value.filter((q) => q.parentQuestId === quest.value?.id))

const assignedCharacters = computed(() => {
  if (!quest.value?.assignedCharacterIdsJson) return []
  try {
    const ids: string[] = JSON.parse(quest.value.assignedCharacterIdsJson)
    return allCharacters.value.filter((c) => ids.includes(c.id))
  } catch {
    return []
  }
})

const statusClass = computed(() => {
  switch (quest.value?.status) {
    case 'active':
      return 'bg-blue-100 text-blue-700'
    case 'completed':
      return 'bg-green-100 text-green-700'
    case 'failed':
      return 'bg-red-100 text-red-700'
    default:
      return 'bg-secondary text-secondary-foreground'
  }
})

// Secret block reveal composable
const { loadRevealedBlocks, injectRevealButtons } = useSecretReveals(
  contentRef,
  campaignId,
  slug,
  isDm,
  t,
)

onMounted(async () => {
  try {
    const [q, quests, chars, campaign] = await Promise.all([
      api.getQuest(slug),
      api.getQuests({}),
      api.getCharacters({}),
      api.getCampaign().catch(() => null),
    ])
    quest.value = q
    allQuests.value = quests
    allCharacters.value = chars
    campaignRole.value = ((campaign as Record<string, unknown>)?.role as string) ?? ''
    if (q.entityId) {
      try {
        linkedEntity.value = await api.getEntity(q.entityId)
      } catch {
        // entity not found, skip
      }
    }
  } catch {
    await router.push(`/campaigns/${campaignId}/quests`)
  } finally {
    loading.value = false
  }
  await loadRevealedBlocks()
  await nextTick()
  injectRevealButtons()
})
</script>
