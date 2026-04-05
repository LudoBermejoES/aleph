<template>
  <div class="p-8 max-w-3xl">
    <div class="flex items-center gap-2 text-sm text-muted-foreground mb-4">
      <NuxtLink :to="`/campaigns/${campaignId}`" class="hover:text-primary"> {{ $t('common.campaign') }}</NuxtLink>
      <span>/</span>
      <NuxtLink :to="`/campaigns/${campaignId}/quests`" class="hover:text-primary">{{ $t('quests.title') }}</NuxtLink>
      <span>/</span>
      <span>{{ form.name || 'Quest' }}</span>
      <span>/</span><span>{{ $t('common.edit') }}</span>
    </div>
    <h1 class="text-2xl font-bold mb-6">{{ $t('quests.edit') }}</h1>
    <QuestForm ref="questForm" v-if="loaded" v-model="form" :campaign-id="campaignId" :quest-slug="slug" :submit-label="$t('common.save')" :submitting="submitting" :collaborative="isCollaborative" :document-name="documentName" :user-name="userName" :user-color="userColor" @submit="save">
      <template #cancel>
        <NuxtLink :to="`/campaigns/${campaignId}/quests`"><Button variant="outline">{{ $t('common.cancel') }}</Button></NuxtLink>
      </template>
    </QuestForm>
    <ErrorToast v-if="error" :message="error" @dismiss="error = ''" />
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const router = useRouter()
const campaignId = route.params.id as string
const slug = route.params.slug as string
const submitting = ref(false)
const loaded = ref(false)
const error = ref('')
const { t } = useI18n()
const form = ref({ name: '', status: 'active', parentQuestId: '', isSecret: false, content: '' })

const isCollaborative = computed(() => route.query.collab === 'true')
const documentName = computed(() => isCollaborative.value ? `campaign:${campaignId}:quest:${slug}` : undefined)
const { userName, userColor } = useCollaborationUser()

const api = useCampaignApi(campaignId)
const questForm = ref<any>(null)

onMounted(async () => {
  try {
    const q = await api.getQuest(slug) as any
    form.value = {
      name: q.name || '',
      status: q.status || 'active',
      parentQuestId: q.parentQuestId || '',
      isSecret: q.isSecret || false,
      content: q.content || '',
    }
    loaded.value = true
  } catch {
    error.value = t('errors.failedLoad')
    await router.push(`/campaigns/${campaignId}/quests`)
  }
})

async function save() {
  submitting.value = true
  try {
    await api.updateQuest(slug, form.value)
    questForm.value?.clearDraft()
    await router.push(`/campaigns/${campaignId}/quests`)
  } catch (e: any) {
    error.value = e.data?.message || t('quests.failedSave')
  } finally {
    submitting.value = false
  }
}
</script>
