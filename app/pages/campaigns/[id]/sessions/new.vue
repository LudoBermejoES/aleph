<template>
  <div class="p-8 max-w-3xl">
    <div class="flex items-center gap-2 text-sm text-muted-foreground mb-4">
      <NuxtLink :to="`/campaigns/${campaignId}`" class="hover:text-primary">Campaign</NuxtLink>
      <span>/</span>
      <NuxtLink :to="`/campaigns/${campaignId}/sessions`" class="hover:text-primary">{{ $t('sessions.title') }}</NuxtLink>
      <span>/</span><span>{{ $t('sessions.new') }}</span>
    </div>
    <h1 class="text-2xl font-bold mb-6">{{ $t('sessions.new') }}</h1>
    <SessionForm ref="sessionForm" v-model="form" :campaign-id="campaignId" :submit-label="$t('common.create')" :submitting="submitting" @submit="create">
      <template #cancel>
        <NuxtLink :to="`/campaigns/${campaignId}/sessions`"><Button variant="outline">{{ $t('common.cancel') }}</Button></NuxtLink>
      </template>
    </SessionForm>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const router = useRouter()
const campaignId = route.params.id as string
const submitting = ref(false)
const { t } = useI18n()
const form = ref({ title: '', scheduledDate: '', status: 'planned', content: '' })

const api = useCampaignApi(campaignId)
const sessionForm = ref<any>(null)

async function create() {
  submitting.value = true
  try {
    const res = await api.createSession(form.value)
    sessionForm.value?.clearDraft()
    await router.push(`/campaigns/${campaignId}/sessions/${res.slug}`)
  } catch (e: any) {
    alert(e.data?.message || t('sessions.failedSave'))
  } finally {
    submitting.value = false
  }
}
</script>
