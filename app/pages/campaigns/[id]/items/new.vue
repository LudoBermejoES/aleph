<template>
  <div class="p-8 max-w-3xl">
    <div class="flex items-center gap-2 text-sm text-muted-foreground mb-4">
      <NuxtLink :to="`/campaigns/${campaignId}`" class="hover:text-primary">Campaign</NuxtLink>
      <span>/</span>
      <NuxtLink :to="`/campaigns/${campaignId}/items`" class="hover:text-primary">Items</NuxtLink>
      <span>/</span><span>New Item</span>
    </div>
    <h1 class="text-2xl font-bold mb-6">Create Item</h1>
    <ItemForm v-model="form" submit-label="Create Item" :submitting="submitting" @submit="create">
      <template #cancel>
        <NuxtLink :to="`/campaigns/${campaignId}/items`"><Button variant="outline">Cancel</Button></NuxtLink>
      </template>
    </ItemForm>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const router = useRouter()
const campaignId = route.params.id as string
const submitting = ref(false)
const form = ref({ name: '', rarity: 'common', type: '', weight: '', size: '', description: '' })

async function create() {
  submitting.value = true
  try {
    await $fetch(`/api/campaigns/${campaignId}/items`, { method: 'POST', body: form.value })
    await router.push(`/campaigns/${campaignId}/items`)
  } catch (e: any) {
    alert(e.data?.message || 'Failed to create item')
  } finally {
    submitting.value = false
  }
}
</script>
