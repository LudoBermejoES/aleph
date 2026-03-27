<template>
  <div class="p-8 max-w-3xl">
    <div class="flex items-center gap-2 text-sm text-muted-foreground mb-4">
      <NuxtLink :to="`/campaigns/${campaignId}`" class="hover:text-primary">Campaign</NuxtLink>
      <span>/</span>
      <NuxtLink :to="`/campaigns/${campaignId}/quests`" class="hover:text-primary">{{ $t('quests.title') }}</NuxtLink>
      <span>/</span><span>{{ $t('quests.new') }}</span>
    </div>
    <h1 class="text-2xl font-bold mb-6">{{ $t('quests.new') }}</h1>
    <QuestForm ref="questForm" v-model="form" :campaign-id="campaignId" :submit-label="$t('common.create')" :submitting="submitting" @submit="create">
      <template #cancel>
        <NuxtLink :to="`/campaigns/${campaignId}/quests`"><Button variant="outline">{{ $t('common.cancel') }}</Button></NuxtLink>
      </template>
    </QuestForm>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const router = useRouter()
const campaignId = route.params.id as string
const submitting = ref(false)
const { t } = useI18n()
const form = ref({ name: '', status: 'active', parentQuestId: '', isSecret: false, content: '' })

const api = useCampaignApi(campaignId)
const questForm = ref<any>(null)

async function create() {
  submitting.value = true
  try {
    await api.createQuest(form.value)
    questForm.value?.clearDraft()
    await router.push(`/campaigns/${campaignId}/quests`)
  } catch (e: any) {
    alert(e.data?.message || t('quests.failedSave'))
  } finally {
    submitting.value = false
  }
}
</script>
