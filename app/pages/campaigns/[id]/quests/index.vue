<template>
  <div class="p-8">
    <div class="flex items-center gap-2 text-sm text-muted-foreground mb-1">
      <NuxtLink :to="`/campaigns/${campaignId}`" class="hover:text-primary">Campaign</NuxtLink>
      <span>/</span>
      <span>Quests</span>
    </div>

    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold">Quests</h1>
      <NuxtLink :to="`/campaigns/${campaignId}/quests/new`">
        <Button data-testid="new-quest-btn">New Quest</Button>
      </NuxtLink>
    </div>

    <div class="flex gap-2 mb-6">
      <Button :variant="filter === '' ? 'default' : 'outline'" size="sm" @click="filter = ''; load()">All</Button>
      <Button :variant="filter === 'active' ? 'default' : 'outline'" size="sm" @click="filter = 'active'; load()">Active</Button>
      <Button :variant="filter === 'completed' ? 'default' : 'outline'" size="sm" @click="filter = 'completed'; load()">Completed</Button>
    </div>

    <LoadingSkeleton v-if="loading" :rows="4" />
    <div v-else-if="questList.length" class="space-y-2">
      <div v-for="q in rootQuests" :key="q.id" class="space-y-1">
        <div class="p-3 rounded-lg border border-border">
          <div class="flex items-center justify-between">
            <span class="font-medium">{{ q.name }}</span>
            <span :class="['text-xs px-2 py-0.5 rounded', q.status === 'active' ? 'bg-blue-100 text-blue-700' : q.status === 'completed' ? 'bg-green-100 text-green-700' : q.status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-secondary text-secondary-foreground']">
              {{ q.status }}
            </span>
          </div>
          <p v-if="q.description" class="text-sm text-muted-foreground mt-1">{{ q.description }}</p>
        </div>
        <!-- Sub-quests -->
        <div v-for="sub in childQuests(q.id)" :key="sub.id" class="ml-6 p-2 rounded border border-border/50 text-sm">
          <span>{{ sub.name }}</span>
          <span :class="['text-xs ml-2 px-1.5 py-0.5 rounded', sub.status === 'active' ? 'bg-blue-50 text-blue-600' : 'bg-secondary text-secondary-foreground']">{{ sub.status }}</span>
        </div>
      </div>
    </div>
    <EmptyState v-else icon="⚔️" title="No quests yet" description="Create your first quest to get started." />
    <ErrorToast v-if="error" :message="error" @dismiss="dismissError" />
  </div>
</template>

<script setup lang="ts">

const route = useRoute()
const campaignId = route.params.id as string
import type { Quest } from '~/types/api'

const questList = ref<Quest[]>([])
const filter = ref('')
const api = useCampaignApi(campaignId)
const { loading, error, withLoading, dismissError } = useLoadingState()

const rootQuests = computed(() => questList.value.filter(q => !q.parentQuestId))
function childQuests(parentId: string) { return questList.value.filter(q => q.parentQuestId === parentId) }

async function load() {
  await withLoading(async () => {
    const params: Record<string, string> = {}
    if (filter.value) params.status = filter.value
    questList.value = await api.getQuests(params)
  })
}

onMounted(load)
</script>
