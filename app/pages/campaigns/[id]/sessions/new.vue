<template>
  <div class="p-8 max-w-3xl">
    <div class="flex items-center gap-2 text-sm text-muted-foreground mb-4">
      <NuxtLink :to="`/campaigns/${campaignId}`" class="hover:text-primary">Campaign</NuxtLink>
      <span>/</span>
      <NuxtLink :to="`/campaigns/${campaignId}/sessions`" class="hover:text-primary">Sessions</NuxtLink>
      <span>/</span><span>New Session</span>
    </div>
    <h1 class="text-2xl font-bold mb-6">Create Session</h1>
    <SessionForm v-model="form" submit-label="Create Session" :submitting="submitting" @submit="create">
      <template #cancel>
        <NuxtLink :to="`/campaigns/${campaignId}/sessions`"><Button variant="outline">Cancel</Button></NuxtLink>
      </template>
    </SessionForm>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const router = useRouter()
const campaignId = route.params.id as string
const submitting = ref(false)
const form = ref({ title: '', scheduledDate: '', status: 'planned', content: '' })

const api = useCampaignApi(campaignId)

async function create() {
  submitting.value = true
  try {
    const res = await api.createSession(form.value)
    await router.push(`/campaigns/${campaignId}/sessions/${res.slug}`)
  } catch (e: any) {
    alert(e.data?.message || 'Failed to create session')
  } finally {
    submitting.value = false
  }
}
</script>
