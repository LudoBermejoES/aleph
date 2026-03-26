<template>
  <div class="p-8 max-w-3xl">
    <div class="flex items-center gap-2 text-sm text-muted-foreground mb-4">
      <NuxtLink :to="`/campaigns/${campaignId}`" class="hover:text-primary">Campaign</NuxtLink>
      <span>/</span>
      <NuxtLink :to="`/campaigns/${campaignId}/entities`" class="hover:text-primary">{{ $t('entities.title') }}</NuxtLink>
      <span>/</span><span>{{ $t('entities.new') }}</span>
    </div>
    <h1 class="text-2xl font-bold mb-6">{{ $t('entities.new') }}</h1>
    <EntityForm v-model="form" :campaign-id="campaignId" :submit-label="$t('common.create')" :submitting="submitting" @submit="create">
      <template #cancel>
        <NuxtLink :to="`/campaigns/${campaignId}/entities`"><Button variant="outline">{{ $t('common.cancel') }}</Button></NuxtLink>
      </template>
    </EntityForm>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const router = useRouter()
const campaignId = route.params.id as string
const submitting = ref(false)
const { t } = useI18n()
const form = ref({ name: '', type: 'note', visibility: 'members', tagsRaw: '', content: '' })

const api = useCampaignApi(campaignId)

async function create() {
  submitting.value = true
  try {
    const tags = form.value.tagsRaw.split(',').map((t: string) => t.trim()).filter(Boolean)
    const res = await api.createEntity({ ...form.value, tags })
    await router.push(`/campaigns/${campaignId}/entities/${res.slug}`)
  } catch (e: any) {
    alert(e.data?.message || t('entities.failedSave'))
  } finally {
    submitting.value = false
  }
}
</script>
