<template>
  <div class="p-8 max-w-3xl">
    <div class="flex items-center gap-2 text-sm text-muted-foreground mb-4">
      <NuxtLink :to="`/campaigns/${campaignId}`" class="hover:text-primary">Campaign</NuxtLink>
      <span>/</span>
      <NuxtLink :to="`/campaigns/${campaignId}/calendars`" class="hover:text-primary">{{ $t('calendars.title') }}</NuxtLink>
      <span>/</span>
      <NuxtLink :to="`/campaigns/${campaignId}/timelines/${slug}`" class="hover:text-primary">{{ form.name || 'Timeline' }}</NuxtLink>
      <span>/</span><span>{{ $t('common.edit') }}</span>
    </div>
    <h1 class="text-2xl font-bold mb-6">{{ $t('timelines.new') }}</h1>
    <TimelineForm v-if="loaded" v-model="form" :submit-label="$t('common.save')" :submitting="submitting" @submit="save">
      <template #cancel>
        <NuxtLink :to="`/campaigns/${campaignId}/timelines/${slug}`"><Button variant="outline">{{ $t('common.cancel') }}</Button></NuxtLink>
      </template>
    </TimelineForm>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const router = useRouter()
const campaignId = route.params.id as string
const slug = route.params.slug as string
const submitting = ref(false)
const loaded = ref(false)
const { t } = useI18n()
const form = ref({ name: '', description: '' })

const api = useCampaignApi(campaignId)

onMounted(async () => {
  try {
    const tl = await api.getTimeline(slug)
    form.value = { name: tl.name || '', description: tl.description || '' }
    loaded.value = true
  } catch {
    alert(t('errors.failedLoad'))
    await router.push(`/campaigns/${campaignId}/timelines/${slug}`)
  }
})

async function save() {
  submitting.value = true
  try {
    await api.updateTimeline(slug, form.value)
    await router.push(`/campaigns/${campaignId}/timelines/${slug}`)
  } catch (e: any) {
    alert(e.data?.message || t('timelines.failedSave'))
  } finally {
    submitting.value = false
  }
}
</script>
