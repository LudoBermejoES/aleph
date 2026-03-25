<template>
  <div class="p-8 max-w-3xl">
    <div class="flex items-center gap-2 text-sm text-muted-foreground mb-4">
      <NuxtLink :to="`/campaigns/${campaignId}`" class="hover:text-primary">Campaign</NuxtLink>
      <span>/</span>
      <NuxtLink :to="`/campaigns/${campaignId}/quests`" class="hover:text-primary">Quests</NuxtLink>
      <span>/</span><span>New Quest</span>
    </div>

    <h1 class="text-2xl font-bold mb-6">Create Quest</h1>

    <form @submit.prevent="create" class="space-y-6">
      <div class="grid grid-cols-2 gap-4">
        <div class="col-span-2">
          <label class="text-sm font-medium">Quest Name *</label>
          <input v-model="form.name" required class="w-full mt-1 px-3 py-2 rounded border border-input bg-background" placeholder="Defeat Strahd" />
        </div>
        <div>
          <label class="text-sm font-medium">Status</label>
          <select v-model="form.status" class="w-full mt-1 px-3 py-2 rounded border border-input bg-background">
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
            <option value="abandoned">Abandoned</option>
          </select>
        </div>
        <div>
          <label class="text-sm font-medium">Parent Quest</label>
          <select v-model="form.parentQuestId" class="w-full mt-1 px-3 py-2 rounded border border-input bg-background">
            <option value="">-- None (root quest) --</option>
            <option v-for="q in quests" :key="q.id" :value="q.id">{{ q.name }}</option>
          </select>
        </div>
        <div class="col-span-2">
          <label class="text-sm font-medium flex items-center gap-2">
            <input v-model="form.isSecret" type="checkbox" />
            Secret (DM only)
          </label>
        </div>
      </div>

      <div>
        <label class="text-sm font-medium">Description</label>
        <MarkdownEditor v-model="form.content" placeholder="Quest details..." class="mt-1" />
      </div>

      <div class="flex justify-end gap-2">
        <NuxtLink :to="`/campaigns/${campaignId}/quests`">
          <Button variant="outline">Cancel</Button>
        </NuxtLink>
        <Button type="submit" :disabled="creating">{{ creating ? 'Creating...' : 'Create Quest' }}</Button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const router = useRouter()
const campaignId = route.params.id as string
const creating = ref(false)
const quests = ref<any[]>([])
const form = ref({ name: '', status: 'active', parentQuestId: '', isSecret: false, content: '' })

onMounted(async () => {
  try { quests.value = await $fetch(`/api/campaigns/${campaignId}/quests`) as any[] } catch { quests.value = [] }
})

async function create() {
  creating.value = true
  try {
    const res = await $fetch(`/api/campaigns/${campaignId}/quests`, { method: 'POST', body: form.value }) as any
    await router.push(`/campaigns/${campaignId}/quests`)
  } catch (e: any) {
    alert(e.data?.message || 'Failed to create quest')
  } finally {
    creating.value = false
  }
}
</script>
