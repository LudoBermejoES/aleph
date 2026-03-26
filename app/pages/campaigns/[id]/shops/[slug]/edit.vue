<template>
  <div class="p-8 max-w-3xl">
    <div class="flex items-center gap-2 text-sm text-muted-foreground mb-4">
      <NuxtLink :to="`/campaigns/${campaignId}`" class="hover:text-primary">Campaign</NuxtLink>
      <span>/</span>
      <NuxtLink :to="`/campaigns/${campaignId}/shops`" class="hover:text-primary">{{ $t('shops.title') }}</NuxtLink>
      <span>/</span>
      <NuxtLink :to="`/campaigns/${campaignId}/shops/${slug}`" class="hover:text-primary">{{ form.name || 'Shop' }}</NuxtLink>
      <span>/</span><span>{{ $t('common.edit') }}</span>
    </div>
    <h1 class="text-2xl font-bold mb-6">{{ $t('shops.new') }}</h1>
    <ShopForm v-if="loaded" v-model="form" :submit-label="$t('common.save')" :submitting="submitting" @submit="save">
      <template #cancel>
        <NuxtLink :to="`/campaigns/${campaignId}/shops/${slug}`"><Button variant="outline">{{ $t('common.cancel') }}</Button></NuxtLink>
      </template>
    </ShopForm>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const router = useRouter()
const campaignId = route.params.id as string
const slug = route.params.slug as string
const api = useCampaignApi(campaignId)
const submitting = ref(false)
const loaded = ref(false)
const { t } = useI18n()
const form = ref({ name: '', description: '' })

onMounted(async () => {
  try {
    const shop = await api.getShop(slug)
    form.value = { name: shop.name || '', description: shop.description || '' }
    loaded.value = true
  } catch {
    alert(t('errors.failedLoad'))
    await router.push(`/campaigns/${campaignId}/shops/${slug}`)
  }
})

async function save() {
  submitting.value = true
  try {
    await api.updateShop(slug, form.value)
    await router.push(`/campaigns/${campaignId}/shops/${slug}`)
  } catch (e: any) {
    alert(e.data?.message || t('shops.failedSave'))
  } finally {
    submitting.value = false
  }
}
</script>
