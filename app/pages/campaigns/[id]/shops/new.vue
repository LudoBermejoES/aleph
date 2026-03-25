<template>
  <div class="p-8 max-w-3xl">
    <div class="flex items-center gap-2 text-sm text-muted-foreground mb-4">
      <NuxtLink :to="`/campaigns/${campaignId}`" class="hover:text-primary">Campaign</NuxtLink>
      <span>/</span>
      <NuxtLink :to="`/campaigns/${campaignId}/shops`" class="hover:text-primary">Shops</NuxtLink>
      <span>/</span><span>New Shop</span>
    </div>

    <h1 class="text-2xl font-bold mb-6">Create Shop</h1>

    <form @submit.prevent="create" class="space-y-6">
      <div>
        <label class="text-sm font-medium">Shop Name *</label>
        <input v-model="form.name" required class="w-full mt-1 px-3 py-2 rounded border border-input bg-background" placeholder="Ye Olde Potion Shoppe" />
      </div>
      <div>
        <label class="text-sm font-medium">Description</label>
        <textarea v-model="form.description" rows="4" class="w-full mt-1 px-3 py-2 rounded border border-input bg-background" placeholder="Shop description..." />
      </div>

      <div class="flex justify-end gap-2">
        <NuxtLink :to="`/campaigns/${campaignId}/shops`">
          <Button variant="outline">Cancel</Button>
        </NuxtLink>
        <Button type="submit" :disabled="creating">{{ creating ? 'Creating...' : 'Create Shop' }}</Button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const campaignId = route.params.id as string
const creating = ref(false)
const form = ref({ name: '', description: '' })

async function create() {
  creating.value = true
  try {
    const res = await $fetch(`/api/campaigns/${campaignId}/shops`, { method: 'POST', body: form.value }) as any
    await navigateTo(`/campaigns/${campaignId}/shops/${res.slug}`)
  } catch (e: any) {
    alert(e.data?.message || 'Failed to create shop')
  } finally {
    creating.value = false
  }
}
</script>
