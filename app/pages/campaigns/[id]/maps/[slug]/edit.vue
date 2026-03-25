<template>
  <div class="p-8 max-w-3xl">
    <div class="flex items-center gap-2 text-sm text-muted-foreground mb-4">
      <NuxtLink :to="`/campaigns/${campaignId}`" class="hover:text-primary">Campaign</NuxtLink>
      <span>/</span>
      <NuxtLink :to="`/campaigns/${campaignId}/maps`" class="hover:text-primary">Maps</NuxtLink>
      <span>/</span>
      <NuxtLink :to="`/campaigns/${campaignId}/maps/${slug}`" class="hover:text-primary">{{ form.name || 'Map' }}</NuxtLink>
      <span>/</span><span>Edit</span>
    </div>
    <h1 class="text-2xl font-bold mb-6">Edit Map</h1>
    <MapForm v-if="loaded" ref="mapFormRef" v-model="form" submit-label="Save Changes" :submitting="submitting" @submit="save">
      <template #cancel>
        <NuxtLink :to="`/campaigns/${campaignId}/maps/${slug}`"><Button variant="outline">Cancel</Button></NuxtLink>
      </template>
    </MapForm>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const router = useRouter()
const campaignId = route.params.id as string
const slug = route.params.slug as string
const submitting = ref(false)
const loaded = ref(false)
const form = ref({ name: '', visibility: 'members' })
const mapFormRef = ref<any>()

onMounted(async () => {
  try {
    const map = await $fetch(`/api/campaigns/${campaignId}/maps/${slug}`) as any
    form.value = { name: map.name || '', visibility: map.visibility || 'members' }
    loaded.value = true
  } catch {
    alert('Failed to load map')
    await router.push(`/campaigns/${campaignId}/maps/${slug}`)
  }
})

async function save() {
  submitting.value = true
  try {
    await $fetch(`/api/campaigns/${campaignId}/maps/${slug}`, { method: 'PUT', body: form.value })
    const file = mapFormRef.value?.fileInput?.files?.[0]
    if (file) {
      const formData = new FormData()
      formData.append('image', file)
      await $fetch(`/api/campaigns/${campaignId}/maps/${slug}/upload`, { method: 'POST', body: formData })
    }
    await router.push(`/campaigns/${campaignId}/maps/${slug}`)
  } catch (e: any) {
    alert(e.data?.message || 'Failed to save')
  } finally {
    submitting.value = false
  }
}
</script>
