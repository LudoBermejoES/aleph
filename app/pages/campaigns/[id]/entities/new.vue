<template>
  <div class="p-8 max-w-3xl">
    <div class="flex items-center gap-2 text-sm text-muted-foreground mb-4">
      <NuxtLink :to="`/campaigns/${campaignId}`" class="hover:text-primary">Campaign</NuxtLink>
      <span>/</span>
      <NuxtLink :to="`/campaigns/${campaignId}/entities`" class="hover:text-primary">Wiki</NuxtLink>
      <span>/</span><span>New Entity</span>
    </div>

    <h1 class="text-2xl font-bold mb-6">Create Entity</h1>

    <form @submit.prevent="create" class="space-y-6">
      <div class="grid grid-cols-2 gap-4">
        <div class="col-span-2">
          <label class="text-sm font-medium">Name *</label>
          <input v-model="form.name" required class="w-full mt-1 px-3 py-2 rounded border border-input bg-background" placeholder="Entity name" />
        </div>
        <div>
          <label class="text-sm font-medium">Type *</label>
          <select v-model="form.type" required class="w-full mt-1 px-3 py-2 rounded border border-input bg-background">
            <option v-for="t in entityTypes" :key="t.slug" :value="t.slug">{{ t.name }}</option>
            <option value="note">Note</option>
          </select>
        </div>
        <div>
          <label class="text-sm font-medium">Visibility</label>
          <select v-model="form.visibility" class="w-full mt-1 px-3 py-2 rounded border border-input bg-background">
            <option value="members">Members</option>
            <option value="public">Public</option>
            <option value="editors">Editors</option>
            <option value="dm_only">DM Only</option>
            <option value="private">Private</option>
          </select>
        </div>
        <div class="col-span-2">
          <label class="text-sm font-medium">Tags (comma-separated)</label>
          <input v-model="form.tagsRaw" class="w-full mt-1 px-3 py-2 rounded border border-input bg-background" placeholder="npc, barovia, undead" />
        </div>
      </div>

      <div>
        <label class="text-sm font-medium">Content</label>
        <MarkdownEditor v-model="form.content" placeholder="Write entity content..." class="mt-1" />
      </div>

      <div class="flex justify-end gap-2">
        <NuxtLink :to="`/campaigns/${campaignId}/entities`">
          <Button variant="outline">Cancel</Button>
        </NuxtLink>
        <Button type="submit" :disabled="creating">{{ creating ? 'Creating...' : 'Create Entity' }}</Button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const router = useRouter()
const campaignId = route.params.id as string
const creating = ref(false)
const entityTypes = ref<any[]>([])
const form = ref({ name: '', type: 'note', visibility: 'members', tagsRaw: '', content: '' })

onMounted(async () => {
  try { entityTypes.value = await $fetch(`/api/campaigns/${campaignId}/entity-types`) as any[] } catch { entityTypes.value = [] }
})

async function create() {
  creating.value = true
  try {
    const tags = form.value.tagsRaw.split(',').map(t => t.trim()).filter(Boolean)
    const res = await $fetch(`/api/campaigns/${campaignId}/entities`, {
      method: 'POST',
      body: { ...form.value, tags },
    }) as any
    await router.push(`/campaigns/${campaignId}/entities/${res.slug}`)
  } catch (e: any) {
    alert(e.data?.message || 'Failed to create entity')
  } finally {
    creating.value = false
  }
}
</script>
