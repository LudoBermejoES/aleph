<template>
  <div class="p-8 max-w-3xl">
    <div class="flex items-center gap-2 text-sm text-muted-foreground mb-4">
      <NuxtLink :to="`/campaigns/${campaignId}`" class="hover:text-primary">Campaign</NuxtLink>
      <span>/</span>
      <NuxtLink :to="`/campaigns/${campaignId}/quests`" class="hover:text-primary">Quests</NuxtLink>
      <span>/</span><span>New Quest</span>
    </div>
    <h1 class="text-2xl font-bold mb-6">Create Quest</h1>
    <QuestForm v-model="form" :campaign-id="campaignId" submit-label="Create Quest" :submitting="submitting" @submit="create">
      <template #cancel>
        <NuxtLink :to="`/campaigns/${campaignId}/quests`"><Button variant="outline">Cancel</Button></NuxtLink>
      </template>
    </QuestForm>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const router = useRouter()
const campaignId = route.params.id as string
const submitting = ref(false)
const form = ref({ name: '', status: 'active', parentQuestId: '', isSecret: false, content: '' })

const api = useCampaignApi(campaignId)

async function create() {
  submitting.value = true
  try {
    await api.createQuest(form.value)
    await router.push(`/campaigns/${campaignId}/quests`)
  } catch (e: any) {
    alert(e.data?.message || 'Failed to create quest')
  } finally {
    submitting.value = false
  }
}
</script>
