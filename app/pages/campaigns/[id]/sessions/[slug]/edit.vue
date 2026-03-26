<template>
  <div class="p-8 max-w-3xl">
    <div class="flex items-center gap-2 text-sm text-muted-foreground mb-4">
      <NuxtLink :to="`/campaigns/${campaignId}`" class="hover:text-primary">Campaign</NuxtLink>
      <span>/</span>
      <NuxtLink :to="`/campaigns/${campaignId}/sessions`" class="hover:text-primary">Sessions</NuxtLink>
      <span>/</span>
      <NuxtLink :to="`/campaigns/${campaignId}/sessions/${slug}`" class="hover:text-primary">{{ form.title || 'Session' }}</NuxtLink>
      <span>/</span><span>Edit</span>
    </div>
    <h1 class="text-2xl font-bold mb-6">Edit Session</h1>
    <SessionForm v-if="loaded" v-model="form" submit-label="Save Changes" :submitting="submitting" @submit="save">
      <template #cancel>
        <NuxtLink :to="`/campaigns/${campaignId}/sessions/${slug}`"><Button variant="outline">Cancel</Button></NuxtLink>
      </template>
    </SessionForm>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const router = useRouter()
const campaignId = route.params.id as string
const slug = route.params.slug as string
const submitting = ref(false)
const loaded = ref(false)
const form = ref({ title: '', scheduledDate: '', status: 'planned', content: '' })

const api = useCampaignApi(campaignId)

onMounted(async () => {
  try {
    const session = await api.getSession(slug)
    form.value = {
      title: session.title || '',
      scheduledDate: session.scheduledDate ? new Date(session.scheduledDate).toISOString().split('T')[0] : '',
      status: session.status || 'planned',
      content: session.logContent || '',
    }
    loaded.value = true
  } catch {
    alert('Failed to load session')
    await router.push(`/campaigns/${campaignId}/sessions/${slug}`)
  }
})

async function save() {
  submitting.value = true
  try {
    await api.updateSession(slug, form.value)
    await router.push(`/campaigns/${campaignId}/sessions/${slug}`)
  } catch (e: any) {
    alert(e.data?.message || 'Failed to save')
  } finally {
    submitting.value = false
  }
}
</script>
