<template>
  <div class="p-8 max-w-3xl">
    <div class="flex items-center gap-2 text-sm text-muted-foreground mb-4">
      <NuxtLink :to="`/campaigns/${campaignId}`" class="hover:text-primary">Campaign</NuxtLink>
      <span>/</span>
      <NuxtLink :to="`/campaigns/${campaignId}/items`" class="hover:text-primary">{{ $t('items.title') }}</NuxtLink>
      <span>/</span><span>{{ $t('items.new') }}</span>
    </div>
    <h1 class="text-2xl font-bold mb-6">{{ $t('items.new') }}</h1>
    <ItemForm v-model="form" :submit-label="$t('common.create')" :submitting="submitting" @submit="create">
      <template #cancel>
        <NuxtLink :to="`/campaigns/${campaignId}/items`"><Button variant="outline">{{ $t('common.cancel') }}</Button></NuxtLink>
      </template>
    </ItemForm>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const router = useRouter()
const campaignId = route.params.id as string
const api = useCampaignApi(campaignId)
const submitting = ref(false)
const { t } = useI18n()
const form = ref({ name: '', rarity: 'common', type: '', weight: '', size: '', description: '' })

async function create() {
  submitting.value = true
  try {
    await api.createItem(form.value)
    await router.push(`/campaigns/${campaignId}/items`)
  } catch (e: any) {
    alert(e.data?.message || t('items.failedSave'))
  } finally {
    submitting.value = false
  }
}
</script>
