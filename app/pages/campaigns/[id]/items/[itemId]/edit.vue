<template>
  <div class="p-8 max-w-3xl">
    <div class="flex items-center gap-2 text-sm text-muted-foreground mb-4">
      <NuxtLink :to="`/campaigns/${campaignId}`" class="hover:text-primary">Campaign</NuxtLink>
      <span>/</span>
      <NuxtLink :to="`/campaigns/${campaignId}/items`" class="hover:text-primary">Items</NuxtLink>
      <span>/</span>
      <span>{{ form.name || 'Item' }}</span>
      <span>/</span><span>Edit</span>
    </div>
    <h1 class="text-2xl font-bold mb-6">Edit Item</h1>
    <ItemForm v-if="loaded" v-model="form" submit-label="Save Changes" :submitting="submitting" @submit="save">
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
const itemId = route.params.itemId as string
const api = useCampaignApi(campaignId)
const submitting = ref(false)
const loaded = ref(false)
const form = ref({ name: '', rarity: 'common', type: '', weight: '', size: '', description: '' })

onMounted(async () => {
  try {
    const item = await api.getItem(itemId)
    form.value = {
      name: item.name || '',
      rarity: item.rarity || 'common',
      type: item.type || '',
      weight: item.weight || '',
      size: item.size || '',
      description: item.description || '',
    }
    loaded.value = true
  } catch {
    alert('Failed to load item')
    await router.push(`/campaigns/${campaignId}/items`)
  }
})

async function save() {
  submitting.value = true
  try {
    await api.updateItem(itemId, form.value)
    await router.push(`/campaigns/${campaignId}/items`)
  } catch (e: any) {
    alert(e.data?.message || 'Failed to save')
  } finally {
    submitting.value = false
  }
}
</script>
