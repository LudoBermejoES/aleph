<template>
  <div class="p-8 max-w-3xl">
    <div class="flex items-center gap-2 text-sm text-muted-foreground mb-4">
      <NuxtLink :to="`/campaigns/${campaignId}`" class="hover:text-primary">Campaign</NuxtLink>
      <span>/</span>
      <NuxtLink :to="`/campaigns/${campaignId}/shops`" class="hover:text-primary">Shops</NuxtLink>
      <span>/</span><span>New Shop</span>
    </div>
    <h1 class="text-2xl font-bold mb-6">Create Shop</h1>
    <ShopForm v-model="form" submit-label="Create Shop" :submitting="submitting" @submit="create">
      <template #cancel>
        <NuxtLink :to="`/campaigns/${campaignId}/shops`"><Button variant="outline">Cancel</Button></NuxtLink>
      </template>
    </ShopForm>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const campaignId = route.params.id as string
const submitting = ref(false)
const form = ref({ name: '', description: '' })

async function create() {
  submitting.value = true
  try {
    const res = await $fetch(`/api/campaigns/${campaignId}/shops`, { method: 'POST', body: form.value }) as any
    await navigateTo(`/campaigns/${campaignId}/shops/${res.slug}`)
  } catch (e: any) {
    alert(e.data?.message || 'Failed to create shop')
  } finally {
    submitting.value = false
  }
}
</script>
