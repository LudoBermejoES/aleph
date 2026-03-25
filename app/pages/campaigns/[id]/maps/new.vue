<template>
  <div class="p-8 max-w-3xl">
    <div class="flex items-center gap-2 text-sm text-muted-foreground mb-4">
      <NuxtLink :to="`/campaigns/${campaignId}`" class="hover:text-primary">Campaign</NuxtLink>
      <span>/</span>
      <NuxtLink :to="`/campaigns/${campaignId}/maps`" class="hover:text-primary">Maps</NuxtLink>
      <span>/</span><span>New Map</span>
    </div>

    <h1 class="text-2xl font-bold mb-6">Create Map</h1>

    <form @submit.prevent="create" class="space-y-6">
      <div>
        <label class="text-sm font-medium">Map Name *</label>
        <input v-model="form.name" required class="w-full mt-1 px-3 py-2 rounded border border-input bg-background" placeholder="Barovia Regional Map" />
      </div>
      <div>
        <label class="text-sm font-medium">Visibility</label>
        <select v-model="form.visibility" class="w-full mt-1 px-3 py-2 rounded border border-input bg-background">
          <option value="members">Members</option>
          <option value="public">Public</option>
          <option value="dm_only">DM Only</option>
        </select>
      </div>
      <div>
        <label class="text-sm font-medium">Map Image (optional)</label>
        <input ref="fileInput" type="file" accept="image/png,image/jpeg,image/webp" class="block w-full mt-1 text-sm border border-input rounded-md p-2 bg-background" />
        <p class="text-xs text-muted-foreground mt-1">PNG, JPEG, or WebP. Max 100MB.</p>
      </div>

      <div class="flex justify-end gap-2">
        <NuxtLink :to="`/campaigns/${campaignId}/maps`">
          <Button variant="outline">Cancel</Button>
        </NuxtLink>
        <Button type="submit" :disabled="creating">{{ creating ? 'Creating...' : 'Create Map' }}</Button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const campaignId = route.params.id as string
const creating = ref(false)
const form = ref({ name: '', visibility: 'members' })
const fileInput = ref<HTMLInputElement>()

async function create() {
  creating.value = true
  try {
    const res = await $fetch(`/api/campaigns/${campaignId}/maps`, { method: 'POST', body: form.value }) as any
    const slug = res.slug

    const file = fileInput.value?.files?.[0]
    if (file) {
      const formData = new FormData()
      formData.append('image', file)
      await $fetch(`/api/campaigns/${campaignId}/maps/${slug}/upload`, { method: 'POST', body: formData })
    }

    await navigateTo(`/campaigns/${campaignId}/maps/${slug}`)
  } catch (e: any) {
    alert(e.data?.message || 'Failed to create map')
  } finally {
    creating.value = false
  }
}
</script>
