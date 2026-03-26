<template>
  <div class="p-8 max-w-3xl">
    <div class="flex items-center gap-2 text-sm text-muted-foreground mb-4">
      <NuxtLink :to="`/campaigns/${campaignId}`" class="hover:text-primary">Campaign</NuxtLink>
      <span>/</span>
      <NuxtLink :to="`/campaigns/${campaignId}/maps`" class="hover:text-primary">{{ $t('maps.title') }}</NuxtLink>
      <span>/</span><span>{{ $t('maps.new') }}</span>
    </div>
    <h1 class="text-2xl font-bold mb-6">{{ $t('maps.new') }}</h1>
    <MapForm ref="mapFormRef" v-model="form" :submit-label="$t('common.create')" :submitting="submitting" @submit="create">
      <template #cancel>
        <NuxtLink :to="`/campaigns/${campaignId}/maps`"><Button variant="outline">{{ $t('common.cancel') }}</Button></NuxtLink>
      </template>
    </MapForm>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const campaignId = route.params.id as string
const submitting = ref(false)
const { t } = useI18n()
const form = ref({ name: '', visibility: 'members' })
const mapFormRef = ref<any>()

const api = useCampaignApi(campaignId)

async function create() {
  submitting.value = true
  try {
    const res = await api.createMap(form.value)
    const file = mapFormRef.value?.fileInput?.files?.[0]
    if (file) {
      const formData = new FormData()
      formData.append('image', file)
      await api.uploadMapImage(res.slug, formData)
    }
    await navigateTo(`/campaigns/${campaignId}/maps/${res.slug}`)
  } catch (e: any) {
    alert(e.data?.message || t('maps.failedSave'))
  } finally {
    submitting.value = false
  }
}
</script>
