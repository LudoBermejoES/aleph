<template>
  <div class="p-8 max-w-3xl">
    <div class="flex items-center gap-2 text-sm text-muted-foreground mb-4">
      <NuxtLink :to="`/campaigns/${campaignId}`" class="hover:text-primary">Campaign</NuxtLink>
      <span>/</span>
      <NuxtLink :to="`/campaigns/${campaignId}/entities`" class="hover:text-primary">Wiki</NuxtLink>
      <span>/</span>
      <NuxtLink :to="`/campaigns/${campaignId}/entities/${slug}`" class="hover:text-primary">{{ form.name || 'Entity' }}</NuxtLink>
      <span>/</span><span>Edit</span>
    </div>
    <h1 class="text-2xl font-bold mb-6">Edit Entity</h1>
    <EntityForm v-if="loaded" v-model="form" :campaign-id="campaignId" submit-label="Save Changes" :submitting="submitting" @submit="save">
      <template #cancel>
        <NuxtLink :to="`/campaigns/${campaignId}/entities/${slug}`"><Button variant="outline">Cancel</Button></NuxtLink>
      </template>
    </EntityForm>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const router = useRouter()
const campaignId = route.params.id as string
const slug = route.params.slug as string
const submitting = ref(false)
const loaded = ref(false)
const form = ref({ name: '', type: 'note', visibility: 'members', tagsRaw: '', content: '' })

onMounted(async () => {
  try {
    const entity = await $fetch(`/api/campaigns/${campaignId}/entities/${slug}`) as any
    form.value = {
      name: entity.name || '',
      type: entity.type || 'note',
      visibility: entity.visibility || 'members',
      tagsRaw: (entity.frontmatter?.tags || []).join(', '),
      content: entity.content || '',
    }
    loaded.value = true
  } catch {
    alert('Failed to load entity')
    await router.push(`/campaigns/${campaignId}/entities/${slug}`)
  }
})

async function save() {
  submitting.value = true
  try {
    const tags = form.value.tagsRaw.split(',').map(t => t.trim()).filter(Boolean)
    await $fetch(`/api/campaigns/${campaignId}/entities/${slug}`, {
      method: 'PUT', body: { ...form.value, tags },
    })
    await router.push(`/campaigns/${campaignId}/entities/${slug}`)
  } catch (e: any) {
    alert(e.data?.message || 'Failed to save')
  } finally {
    submitting.value = false
  }
}
</script>
