<template>
  <div class="p-8 max-w-3xl">
    <div class="flex items-center gap-2 text-sm text-muted-foreground mb-4">
      <NuxtLink :to="`/campaigns/${campaignId}`" class="hover:text-primary">Campaign</NuxtLink>
      <span>/</span>
      <NuxtLink :to="`/campaigns/${campaignId}/sessions`" class="hover:text-primary">Sessions</NuxtLink>
      <span>/</span><span>New Session</span>
    </div>

    <h1 class="text-2xl font-bold mb-6">Create Session</h1>

    <form @submit.prevent="create" class="space-y-6">
      <div class="grid grid-cols-2 gap-4">
        <div class="col-span-2">
          <label class="text-sm font-medium">Title</label>
          <input v-model="form.title" class="w-full mt-1 px-3 py-2 rounded border border-input bg-background" placeholder="Leave empty for auto-numbered title" />
        </div>
        <div>
          <label class="text-sm font-medium">Scheduled Date</label>
          <input v-model="form.scheduledDate" type="date" class="w-full mt-1 px-3 py-2 rounded border border-input bg-background" />
        </div>
        <div>
          <label class="text-sm font-medium">Status</label>
          <select v-model="form.status" class="w-full mt-1 px-3 py-2 rounded border border-input bg-background">
            <option value="planned">Planned</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      <div>
        <label class="text-sm font-medium">Session Notes</label>
        <MarkdownEditor v-model="form.content" placeholder="Write session notes..." class="mt-1" />
      </div>

      <div class="flex justify-end gap-2">
        <NuxtLink :to="`/campaigns/${campaignId}/sessions`">
          <Button variant="outline">Cancel</Button>
        </NuxtLink>
        <Button type="submit" :disabled="creating">{{ creating ? 'Creating...' : 'Create Session' }}</Button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const router = useRouter()
const campaignId = route.params.id as string
const creating = ref(false)
const form = ref({ title: '', scheduledDate: '', status: 'planned', content: '' })

async function create() {
  creating.value = true
  try {
    const res = await $fetch(`/api/campaigns/${campaignId}/sessions`, { method: 'POST', body: form.value }) as any
    await router.push(`/campaigns/${campaignId}/sessions/${res.slug}`)
  } catch (e: any) {
    alert(e.data?.message || 'Failed to create session')
  } finally {
    creating.value = false
  }
}
</script>
