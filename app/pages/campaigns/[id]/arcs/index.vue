<template>
  <div class="p-8 max-w-3xl">
    <div class="flex items-center gap-2 text-sm text-muted-foreground mb-1">
      <NuxtLink :to="`/campaigns/${campaignId}`" class="hover:text-primary">{{
        $t('common.campaign')
      }}</NuxtLink>
      <span>/</span>
      <span>{{ $t('arcs.title') }}</span>
    </div>

    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold">{{ $t('arcs.title') }}</h1>
    </div>

    <LoadingSkeleton v-if="loading" :rows="3" />
    <div v-else-if="arcList.length" class="space-y-3">
      <div
        v-for="arc in arcList"
        :key="arc.id"
        class="p-4 rounded-lg border border-border hover:bg-accent/20 transition-colors"
      >
        <div class="flex items-start justify-between gap-4">
          <NuxtLink :to="`/campaigns/${campaignId}/arcs/${arc.slug}`" class="flex-1 min-w-0">
            <div class="font-semibold hover:text-primary">{{ arc.name }}</div>
            <p v-if="arc.description" class="text-sm text-muted-foreground mt-0.5 line-clamp-2">
              {{ arc.description }}
            </p>
          </NuxtLink>
          <div class="flex items-center gap-2 shrink-0">
            <span :class="['text-xs px-2 py-0.5 rounded', arcStatusClass(arc.status)]">{{
              arc.status
            }}</span>
            <span class="text-xs text-muted-foreground"
              >{{ arc.chapters?.length ?? 0 }} {{ $t('arcs.chapters') }}</span
            >
          </div>
        </div>
      </div>
    </div>
    <EmptyState
      v-else
      icon="📖"
      :title="$t('arcs.empty')"
      :description="$t('arcs.emptyDescription')"
    />

    <!-- Create arc form (DM only) -->
    <div v-if="canCreate" class="mt-6 p-4 rounded-lg border border-dashed border-border">
      <h2 class="text-sm font-semibold mb-3">{{ $t('arcs.new') }}</h2>
      <div class="flex gap-2">
        <input
          v-model="newName"
          type="text"
          :placeholder="$t('arcs.namePlaceholder')"
          class="flex-1 px-3 py-1.5 rounded border border-input bg-background text-sm"
          @keydown.enter="createArc"
        />
        <Button size="sm" :disabled="!newName.trim() || creating" @click="createArc">
          {{ $t('common.create') }}
        </Button>
      </div>
    </div>

    <ErrorToast v-if="error" :message="error" @dismiss="dismissError" />
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const router = useRouter()
const campaignId = route.params.id as string
const api = useCampaignApi(campaignId)
const { loading, error, withLoading, dismissError } = useLoadingState()

interface Arc {
  id: string
  slug: string
  name: string
  status: string
}

const arcList = ref<Arc[]>([])
const newName = ref('')
const creating = ref(false)
const canCreate = ref(false)

function arcStatusClass(status: string) {
  switch (status) {
    case 'active':
      return 'bg-blue-100 text-blue-700'
    case 'completed':
      return 'bg-green-100 text-green-700'
    case 'paused':
      return 'bg-yellow-100 text-yellow-700'
    default:
      return 'bg-secondary text-secondary-foreground'
  }
}

async function load() {
  await withLoading(async () => {
    const [arcs, campaign] = await Promise.all([api.getArcs(), api.getCampaign()])
    arcList.value = arcs
    canCreate.value = ['dm', 'co_dm'].includes((campaign as { role?: string }).role ?? '')
  })
}

async function createArc() {
  if (!newName.value.trim()) return
  creating.value = true
  try {
    const arc = await api.createArc({ name: newName.value.trim() })
    newName.value = ''
    await router.push(`/campaigns/${campaignId}/arcs/${arc.slug ?? arc.id}`)
  } finally {
    creating.value = false
  }
}

onMounted(load)
</script>
