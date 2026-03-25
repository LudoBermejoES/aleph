<template>
  <div class="p-8 max-w-3xl">
    <div class="flex items-center gap-2 text-sm text-muted-foreground mb-4">
      <NuxtLink :to="`/campaigns/${campaignId}`" class="hover:text-primary">Campaign</NuxtLink>
      <span>/</span>
      <NuxtLink :to="`/campaigns/${campaignId}/calendars`" class="hover:text-primary">Calendars</NuxtLink>
      <span>/</span><span>New Timeline</span>
    </div>
    <h1 class="text-2xl font-bold mb-6">Create Timeline</h1>
    <TimelineForm v-model="form" submit-label="Create Timeline" :submitting="submitting" @submit="create">
      <template #cancel>
        <NuxtLink :to="`/campaigns/${campaignId}/calendars`"><Button variant="outline">Cancel</Button></NuxtLink>
      </template>
    </TimelineForm>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const router = useRouter()
const campaignId = route.params.id as string
const submitting = ref(false)
const form = ref({ name: '', description: '' })

async function create() {
  submitting.value = true
  try {
    const res = await $fetch(`/api/campaigns/${campaignId}/timelines`, { method: 'POST', body: form.value }) as any
    await router.push(`/campaigns/${campaignId}/timelines/${res.slug}`)
  } catch (e: any) {
    alert(e.data?.message || 'Failed to create timeline')
  } finally {
    submitting.value = false
  }
}
</script>
