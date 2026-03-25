<template>
  <div class="p-8 max-w-3xl">
    <div class="flex items-center gap-2 text-sm text-muted-foreground mb-4">
      <NuxtLink :to="`/campaigns/${campaignId}`" class="hover:text-primary">Campaign</NuxtLink>
      <span>/</span>
      <NuxtLink :to="`/campaigns/${campaignId}/calendars`" class="hover:text-primary">Calendars</NuxtLink>
      <span>/</span><span>New Timeline</span>
    </div>

    <h1 class="text-2xl font-bold mb-6">Create Timeline</h1>

    <form @submit.prevent="create" class="space-y-6">
      <div>
        <label class="text-sm font-medium">Timeline Name *</label>
        <input v-model="form.name" required class="w-full mt-1 px-3 py-2 rounded border border-input bg-background" placeholder="Campaign Arc 1" />
      </div>
      <div>
        <label class="text-sm font-medium">Description</label>
        <textarea v-model="form.description" rows="4" class="w-full mt-1 px-3 py-2 rounded border border-input bg-background" placeholder="Optional description..." />
      </div>

      <div class="flex justify-end gap-2">
        <NuxtLink :to="`/campaigns/${campaignId}/calendars`">
          <Button variant="outline">Cancel</Button>
        </NuxtLink>
        <Button type="submit" :disabled="creating">{{ creating ? 'Creating...' : 'Create Timeline' }}</Button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const router = useRouter()
const campaignId = route.params.id as string
const creating = ref(false)
const form = ref({ name: '', description: '' })

async function create() {
  creating.value = true
  try {
    const res = await $fetch(`/api/campaigns/${campaignId}/timelines`, { method: 'POST', body: form.value }) as any
    await router.push(`/campaigns/${campaignId}/timelines/${res.slug}`)
  } catch (e: any) {
    alert(e.data?.message || 'Failed to create timeline')
  } finally {
    creating.value = false
  }
}
</script>
