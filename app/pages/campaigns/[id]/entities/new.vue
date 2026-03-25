<template>
  <div class="p-8 max-w-3xl">
    <div class="flex items-center gap-2 text-sm text-muted-foreground mb-4">
      <NuxtLink :to="`/campaigns/${campaignId}`" class="hover:text-primary">Campaign</NuxtLink>
      <span>/</span>
      <NuxtLink :to="`/campaigns/${campaignId}/entities`" class="hover:text-primary">Wiki</NuxtLink>
      <span>/</span><span>New Entity</span>
    </div>
    <h1 class="text-2xl font-bold mb-6">Create Entity</h1>
    <EntityForm v-model="form" :campaign-id="campaignId" submit-label="Create Entity" :submitting="submitting" @submit="create">
      <template #cancel>
        <NuxtLink :to="`/campaigns/${campaignId}/entities`"><Button variant="outline">Cancel</Button></NuxtLink>
      </template>
    </EntityForm>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const router = useRouter()
const campaignId = route.params.id as string
const submitting = ref(false)
const form = ref({ name: '', type: 'note', visibility: 'members', tagsRaw: '', content: '' })

async function create() {
  submitting.value = true
  try {
    const tags = form.value.tagsRaw.split(',').map(t => t.trim()).filter(Boolean)
    const res = await $fetch(`/api/campaigns/${campaignId}/entities`, {
      method: 'POST', body: { ...form.value, tags },
    }) as any
    await router.push(`/campaigns/${campaignId}/entities/${res.slug}`)
  } catch (e: any) {
    alert(e.data?.message || 'Failed to create entity')
  } finally {
    submitting.value = false
  }
}
</script>
