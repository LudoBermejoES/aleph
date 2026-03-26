<template>
  <div class="p-8 max-w-3xl">
    <div class="flex items-center gap-2 text-sm text-muted-foreground mb-4">
      <NuxtLink :to="`/campaigns/${campaignId}`" class="hover:text-primary">Campaign</NuxtLink>
      <span>/</span>
      <NuxtLink :to="`/campaigns/${campaignId}/shops`" class="hover:text-primary">{{ $t('shops.title') }}</NuxtLink>
      <span>/</span><span>{{ $t('shops.new') }}</span>
    </div>
    <h1 class="text-2xl font-bold mb-6">{{ $t('shops.new') }}</h1>
    <ShopForm v-model="form" :submit-label="$t('common.create')" :submitting="submitting" @submit="create">
      <template #cancel>
        <NuxtLink :to="`/campaigns/${campaignId}/shops`"><Button variant="outline">{{ $t('common.cancel') }}</Button></NuxtLink>
      </template>
    </ShopForm>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const campaignId = route.params.id as string
const api = useCampaignApi(campaignId)
const submitting = ref(false)
const { t } = useI18n()
const form = ref({ name: '', description: '' })

async function create() {
  submitting.value = true
  try {
    const res = await api.createShop(form.value)
    await navigateTo(`/campaigns/${campaignId}/shops/${res.slug}`)
  } catch (e: any) {
    alert(e.data?.message || t('shops.failedSave'))
  } finally {
    submitting.value = false
  }
}
</script>
