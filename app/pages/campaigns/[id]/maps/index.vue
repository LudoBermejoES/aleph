<template>
  <div class="p-8">
    <div class="flex items-center gap-2 text-sm text-muted-foreground mb-1">
      <NuxtLink :to="`/campaigns/${campaignId}`" class="hover:text-primary">Campaign</NuxtLink>
      <span>/</span>
      <span>{{ $t('maps.title') }}</span>
    </div>

    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold">{{ $t('maps.title') }}</h1>
      <NuxtLink :to="`/campaigns/${campaignId}/maps/new`">
        <Button data-testid="new-map-btn">{{ $t('maps.new') }}</Button>
      </NuxtLink>
    </div>

    <LoadingSkeleton v-if="loading" :rows="4" />
    <div v-else-if="mapList.length" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <NuxtLink v-for="m in mapList" :key="m.id" :to="`/campaigns/${campaignId}/maps/${m.slug}`">
        <Card class="hover:border-primary/50 transition-colors cursor-pointer h-full">
          <CardHeader>
            <CardTitle class="text-lg">{{ m.name }}</CardTitle>
            <CardDescription v-if="m.width">{{ m.width }}x{{ m.height }}px</CardDescription>
          </CardHeader>
        </Card>
      </NuxtLink>
    </div>
    <EmptyState v-else icon="🗺️" :title="$t('maps.empty')" :description="$t('maps.emptyDescription')" />
    <ErrorToast v-if="error" :message="error" @dismiss="dismissError" />
  </div>
</template>

<script setup lang="ts">

const route = useRoute()
const campaignId = route.params.id as string
import type { CampaignMap } from '~/types/api'

const mapList = ref<CampaignMap[]>([])
const { loading, error, withLoading, dismissError } = useLoadingState()
const api = useCampaignApi(campaignId)

async function load() {
  await withLoading(async () => {
    mapList.value = await api.getMaps({ root: 'true' })
  })
}

onMounted(load)
</script>
