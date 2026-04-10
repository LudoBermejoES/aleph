<template>
  <div class="p-8 max-w-3xl">
    <div class="flex items-center gap-2 text-sm text-muted-foreground mb-4 flex-wrap">
      <NuxtLink :to="`/campaigns/${campaignId}`" class="hover:text-primary">
        {{ $t('common.campaign') }}</NuxtLink
      >
      <span>/</span>
      <NuxtLink :to="`/campaigns/${campaignId}/locations`" class="hover:text-primary">{{
        $t('locations.title')
      }}</NuxtLink>
      <span>/</span>
      <NuxtLink :to="`/campaigns/${campaignId}/locations/${slug}`" class="hover:text-primary">{{
        form.name
      }}</NuxtLink>
      <span>/</span><span>{{ $t('common.edit') }}</span>
    </div>
    <h1 class="text-2xl font-bold mb-6">{{ $t('locations.edit') }}</h1>
    <div v-if="loading" class="text-muted-foreground">{{ $t('common.loading') }}</div>
    <LocationForm
      v-else
      ref="locationForm"
      v-model="form"
      :campaign-id="campaignId"
      :location-slug="slug"
      :submit-label="$t('common.save')"
      :submitting="submitting"
      @submit="save"
    >
      <template #cancel>
        <NuxtLink :to="`/campaigns/${campaignId}/locations/${slug}`"
          ><Button variant="outline">{{ $t('common.cancel') }}</Button></NuxtLink
        >
      </template>
    </LocationForm>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const campaignId = route.params.id as string
const slug = route.params.slug as string
const api = useCampaignApi(campaignId)
const submitting = ref(false)
const loading = ref(true)
const locationForm = ref<{ clearDraft: () => void } | null>(null)
const form = ref({
  name: '',
  subtype: 'other',
  parentId: '',
  visibility: 'members',
  content: '',
  templateId: '',
  templateFields: {} as Record<string, unknown>,
})

onMounted(async () => {
  try {
    const loc = await api.getLocation(slug)
    form.value = {
      name: loc.name as string,
      subtype: (loc.subtype as string) || 'other',
      parentId: (loc.parentId as string) || '',
      visibility: (loc.visibility as string) || 'members',
      content: (loc.content as string) || '',
      templateId: (loc.templateId as string) || '',
      templateFields: (loc.fields as Record<string, unknown>) || {},
    }
  } catch {
    await router.push(`/campaigns/${campaignId}/locations`)
  } finally {
    loading.value = false
  }
})

async function save() {
  submitting.value = true
  try {
    const { templateFields, ...rest } = form.value
    const res = await api.updateLocation(slug, {
      ...rest,
      parentId: form.value.parentId || undefined,
      fields: templateFields,
    })
    locationForm.value?.clearDraft()
    await router.push(`/campaigns/${campaignId}/locations/${res.slug}`)
  } catch (e: unknown) {
    alert((e as { data?: { message?: string } })?.data?.message || t('locations.failedSave'))
  } finally {
    submitting.value = false
  }
}
</script>
