<template>
  <div class="p-8 max-w-3xl">
    <div class="flex items-center gap-2 text-sm text-muted-foreground mb-4">
      <NuxtLink :to="`/campaigns/${campaignId}`" class="hover:text-primary">Campaign</NuxtLink>
      <span>/</span>
      <NuxtLink :to="`/campaigns/${campaignId}/items`" class="hover:text-primary">Items</NuxtLink>
      <span>/</span><span>New Item</span>
    </div>

    <h1 class="text-2xl font-bold mb-6">Create Item</h1>

    <form @submit.prevent="create" class="space-y-6">
      <div class="grid grid-cols-2 gap-4">
        <div class="col-span-2">
          <label class="text-sm font-medium">Item Name *</label>
          <input v-model="form.name" required class="w-full mt-1 px-3 py-2 rounded border border-input bg-background" placeholder="Vorpal Sword" />
        </div>
        <div>
          <label class="text-sm font-medium">Rarity</label>
          <select v-model="form.rarity" class="w-full mt-1 px-3 py-2 rounded border border-input bg-background">
            <option value="common">Common</option>
            <option value="uncommon">Uncommon</option>
            <option value="rare">Rare</option>
            <option value="very_rare">Very Rare</option>
            <option value="legendary">Legendary</option>
          </select>
        </div>
        <div>
          <label class="text-sm font-medium">Type</label>
          <input v-model="form.type" class="w-full mt-1 px-3 py-2 rounded border border-input bg-background" placeholder="weapon, armor, potion..." />
        </div>
        <div>
          <label class="text-sm font-medium">Weight</label>
          <input v-model="form.weight" class="w-full mt-1 px-3 py-2 rounded border border-input bg-background" placeholder="3 lbs" />
        </div>
        <div>
          <label class="text-sm font-medium">Size</label>
          <input v-model="form.size" class="w-full mt-1 px-3 py-2 rounded border border-input bg-background" placeholder="medium, small..." />
        </div>
      </div>

      <div>
        <label class="text-sm font-medium">Description</label>
        <textarea v-model="form.description" rows="5" class="w-full mt-1 px-3 py-2 rounded border border-input bg-background" placeholder="Item description..." />
      </div>

      <div class="flex justify-end gap-2">
        <NuxtLink :to="`/campaigns/${campaignId}/items`">
          <Button variant="outline">Cancel</Button>
        </NuxtLink>
        <Button type="submit" :disabled="creating">{{ creating ? 'Creating...' : 'Create Item' }}</Button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const router = useRouter()
const campaignId = route.params.id as string
const creating = ref(false)
const form = ref({ name: '', rarity: 'common', type: '', weight: '', size: '', description: '' })

async function create() {
  creating.value = true
  try {
    const res = await $fetch(`/api/campaigns/${campaignId}/items`, { method: 'POST', body: form.value }) as any
    await router.push(`/campaigns/${campaignId}/items`)
  } catch (e: any) {
    alert(e.data?.message || 'Failed to create item')
  } finally {
    creating.value = false
  }
}
</script>
