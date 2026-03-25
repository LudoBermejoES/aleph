<template>
  <div class="p-8 max-w-3xl">
    <div class="flex items-center gap-2 text-sm text-muted-foreground mb-4">
      <NuxtLink :to="`/campaigns/${campaignId}`" class="hover:text-primary">Campaign</NuxtLink>
      <span>/</span>
      <NuxtLink :to="`/campaigns/${campaignId}/shops`" class="hover:text-primary">Shops</NuxtLink>
      <span>/</span>
      <NuxtLink :to="`/campaigns/${campaignId}/shops/${slug}`" class="hover:text-primary">{{ form.name || 'Shop' }}</NuxtLink>
      <span>/</span><span>Edit</span>
    </div>
    <h1 class="text-2xl font-bold mb-6">Edit Shop</h1>
    <ShopForm v-if="loaded" v-model="form" submit-label="Save Changes" :submitting="submitting" @submit="save">
      <template #cancel>
        <NuxtLink :to="`/campaigns/${campaignId}/shops/${slug}`"><Button variant="outline">Cancel</Button></NuxtLink>
      </template>
    </ShopForm>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const router = useRouter()
const campaignId = route.params.id as string
const slug = route.params.slug as string
const submitting = ref(false)
const loaded = ref(false)
const form = ref({ name: '', description: '' })

onMounted(async () => {
  try {
    const shop = await $fetch(`/api/campaigns/${campaignId}/shops/${slug}`) as any
    form.value = { name: shop.name || '', description: shop.description || '' }
    loaded.value = true
  } catch {
    alert('Failed to load shop')
    await router.push(`/campaigns/${campaignId}/shops/${slug}`)
  }
})

async function save() {
  submitting.value = true
  try {
    await $fetch(`/api/campaigns/${campaignId}/shops/${slug}`, { method: 'PUT', body: form.value })
    await router.push(`/campaigns/${campaignId}/shops/${slug}`)
  } catch (e: any) {
    alert(e.data?.message || 'Failed to save')
  } finally {
    submitting.value = false
  }
}
</script>
