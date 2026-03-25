<template>
  <div class="p-8 max-w-3xl">
    <div class="flex items-center gap-2 text-sm text-muted-foreground mb-4">
      <NuxtLink :to="`/campaigns/${campaignId}`" class="hover:text-primary">Campaign</NuxtLink>
      <span>/</span>
      <NuxtLink :to="`/campaigns/${campaignId}/calendars`" class="hover:text-primary">Calendars</NuxtLink>
      <span>/</span>
      <NuxtLink :to="`/campaigns/${campaignId}/timelines/${slug}`" class="hover:text-primary">{{ form.name || 'Timeline' }}</NuxtLink>
      <span>/</span><span>Edit</span>
    </div>
    <h1 class="text-2xl font-bold mb-6">Edit Timeline</h1>
    <TimelineForm v-if="loaded" v-model="form" submit-label="Save Changes" :submitting="submitting" @submit="save">
      <template #cancel>
        <NuxtLink :to="`/campaigns/${campaignId}/timelines/${slug}`"><Button variant="outline">Cancel</Button></NuxtLink>
      </template>
    </TimelineForm>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const router = useRouter()
const campaignId = route.params.id as string
const slug = route.params.slug as string
const submitting = ref(false)
const loaded = ref(false)
const form = ref({ name: '', description: '' })

onMounted(async () => {
  try {
    const tl = await $fetch(`/api/campaigns/${campaignId}/timelines/${slug}`) as any
    form.value = { name: tl.name || '', description: tl.description || '' }
    loaded.value = true
  } catch {
    alert('Failed to load timeline')
    await router.push(`/campaigns/${campaignId}/timelines/${slug}`)
  }
})

async function save() {
  submitting.value = true
  try {
    await $fetch(`/api/campaigns/${campaignId}/timelines/${slug}`, { method: 'PUT', body: form.value })
    await router.push(`/campaigns/${campaignId}/timelines/${slug}`)
  } catch (e: any) {
    alert(e.data?.message || 'Failed to save')
  } finally {
    submitting.value = false
  }
}
</script>
