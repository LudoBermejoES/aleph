<template>
  <div class="p-8 max-w-3xl">
    <div class="flex items-center gap-2 text-sm text-muted-foreground mb-4">
      <NuxtLink :to="`/campaigns/${campaignId}`" class="hover:text-primary">Campaign</NuxtLink>
      <span>/</span>
      <NuxtLink :to="`/campaigns/${campaignId}/calendars`" class="hover:text-primary">{{ $t('calendars.title') }}</NuxtLink>
      <span>/</span><span>{{ $t('timelines.new') }}</span>
    </div>
    <h1 class="text-2xl font-bold mb-6">{{ $t('timelines.new') }}</h1>
    <TimelineForm v-model="form" :submit-label="$t('common.create')" :submitting="submitting" @submit="create">
      <template #cancel>
        <NuxtLink :to="`/campaigns/${campaignId}/calendars`"><Button variant="outline">{{ $t('common.cancel') }}</Button></NuxtLink>
      </template>
    </TimelineForm>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const router = useRouter()
const campaignId = route.params.id as string
const submitting = ref(false)
const { t } = useI18n()
const form = ref({ name: '', description: '' })

const api = useCampaignApi(campaignId)

async function create() {
  submitting.value = true
  try {
    const res = await api.createTimeline(form.value)
    await router.push(`/campaigns/${campaignId}/timelines/${res.slug}`)
  } catch (e: any) {
    alert(e.data?.message || t('timelines.failedSave'))
  } finally {
    submitting.value = false
  }
}
</script>
