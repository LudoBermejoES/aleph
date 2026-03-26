<template>
  <div class="p-8 max-w-3xl">
    <div class="flex items-center gap-2 text-sm text-muted-foreground mb-4">
      <NuxtLink :to="`/campaigns/${campaignId}`" class="hover:text-primary">Campaign</NuxtLink>
      <span>/</span>
      <NuxtLink :to="`/campaigns/${campaignId}/maps`" class="hover:text-primary">{{ $t('maps.title') }}</NuxtLink>
      <span>/</span>
      <NuxtLink :to="`/campaigns/${campaignId}/maps/${slug}`" class="hover:text-primary">{{ form.name || 'Map' }}</NuxtLink>
      <span>/</span><span>{{ $t('common.edit') }}</span>
    </div>
    <h1 class="text-2xl font-bold mb-6">{{ $t('maps.new') }}</h1>
    <MapForm v-if="loaded" ref="mapFormRef" v-model="form" :submit-label="$t('common.save')" :submitting="submitting" @submit="save">
      <template #cancel>
        <NuxtLink :to="`/campaigns/${campaignId}/maps/${slug}`"><Button variant="outline">{{ $t('common.cancel') }}</Button></NuxtLink>
      </template>
    </MapForm>
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
const form = ref({ name: '', visibility: 'members' })
const mapFormRef = ref<any>()

const api = useCampaignApi(campaignId)

onMounted(async () => {
  try {
    const map = await api.getMap(slug)
    form.value = { name: map.name || '', visibility: map.visibility || 'members' }
    loaded.value = true
  } catch {
    alert(t('errors.failedLoad'))
    await router.push(`/campaigns/${campaignId}/maps/${slug}`)
  }
})

async function save() {
  submitting.value = true
  try {
    await api.updateMap(slug, form.value)
    const file = mapFormRef.value?.fileInput?.files?.[0]
    if (file) {
      const formData = new FormData()
      formData.append('image', file)
      await api.uploadMapImage(slug, formData)
    }
    await router.push(`/campaigns/${campaignId}/maps/${slug}`)
  } catch (e: any) {
    alert(e.data?.message || t('maps.failedSave'))
  } finally {
    submitting.value = false
  }
}
</script>
