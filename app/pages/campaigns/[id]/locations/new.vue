<template>
  <div class="p-8 max-w-3xl">
    <div class="flex items-center gap-2 text-sm text-muted-foreground mb-4">
      <NuxtLink :to="`/campaigns/${campaignId}`" class="hover:text-primary">Campaign</NuxtLink>
      <span>/</span>
      <NuxtLink :to="`/campaigns/${campaignId}/locations`" class="hover:text-primary">{{ $t('locations.title') }}</NuxtLink>
      <span>/</span><span>{{ $t('locations.new') }}</span>
    </div>
    <h1 class="text-2xl font-bold mb-6">{{ $t('locations.new') }}</h1>
    <LocationForm ref="locationForm" v-model="form" :campaign-id="campaignId" :submit-label="$t('common.create')" :submitting="submitting" @submit="create">
      <template #cancel>
        <NuxtLink :to="`/campaigns/${campaignId}/locations`"><Button variant="outline">{{ $t('common.cancel') }}</Button></NuxtLink>
      </template>
    </LocationForm>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const router = useRouter()
const campaignId = route.params.id as string
const { t } = useI18n()
const submitting = ref(false)
const locationForm = ref<any>(null)
const form = ref({ name: '', subtype: 'other', parentId: (route.query.parentId as string) || '', visibility: 'members', content: '' })
const api = useCampaignApi(campaignId)

async function create() {
  submitting.value = true
  try {
    const res = await api.createLocation({
      ...form.value,
      parentId: form.value.parentId || undefined,
    })
    locationForm.value?.clearDraft()
    await router.push(`/campaigns/${campaignId}/locations/${res.slug}`)
  } catch (e: any) {
    alert(e.data?.message || t('locations.failedSave'))
  } finally {
    submitting.value = false
  }
}
</script>
