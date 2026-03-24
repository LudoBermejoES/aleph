<template>
  <div class="p-8">
    <div class="flex items-center gap-2 text-sm text-muted-foreground mb-1">
      <NuxtLink :to="`/campaigns/${campaignId}`" class="hover:text-primary">Campaign</NuxtLink>
      <span>/</span><span>Items</span>
    </div>
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold">Item Library</h1>
      <Dialog v-model:open="showCreate">
        <DialogTrigger as-child><Button>New Item</Button></DialogTrigger>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Item</DialogTitle></DialogHeader>
          <form @submit.prevent="create" class="space-y-3">
            <Input v-model="form.name" placeholder="Item name" required />
            <select v-model="form.rarity" class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option value="common">Common</option><option value="uncommon">Uncommon</option>
              <option value="rare">Rare</option><option value="very_rare">Very Rare</option>
              <option value="legendary">Legendary</option>
            </select>
            <textarea v-model="form.description" rows="3" placeholder="Description..." class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
            <div class="flex justify-end gap-2">
              <Button type="button" variant="outline" @click="showCreate = false">Cancel</Button>
              <Button type="submit">Create</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
    <div class="flex gap-3 mb-4">
      <select v-model="filter" @change="load" class="rounded-md border border-input bg-background px-3 py-2 text-sm">
        <option value="">All Rarities</option><option value="common">Common</option><option value="uncommon">Uncommon</option>
        <option value="rare">Rare</option><option value="very_rare">Very Rare</option><option value="legendary">Legendary</option>
      </select>
    </div>
    <div v-if="itemList.length" class="space-y-2">
      <div v-for="item in itemList" :key="item.id" class="p-3 rounded border border-border flex items-center justify-between">
        <div>
          <span class="font-medium">{{ item.name }}</span>
          <span :class="['text-xs ml-2 px-2 py-0.5 rounded', rarityColor(item.rarity)]">{{ item.rarity }}</span>
        </div>
        <span v-if="item.priceJson" class="text-xs text-muted-foreground">{{ item.priceJson }}</span>
      </div>
    </div>
    <p v-else class="text-muted-foreground text-center py-8">No items yet.</p>
  </div>
</template>

<script setup lang="ts">
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '~/components/ui/dialog'

const route = useRoute()
const campaignId = route.params.id as string
const itemList = ref<any[]>([])
const showCreate = ref(false)
const filter = ref('')
const form = reactive({ name: '', rarity: 'common', description: '' })

function rarityColor(r: string) {
  const map: Record<string, string> = {
    common: 'bg-secondary text-secondary-foreground', uncommon: 'bg-green-100 text-green-700',
    rare: 'bg-blue-100 text-blue-700', very_rare: 'bg-purple-100 text-purple-700',
    legendary: 'bg-amber-100 text-amber-700',
  }
  return map[r] || map.common
}

async function load() {
  try {
    const params: Record<string, string> = {}
    if (filter.value) params.rarity = filter.value
    itemList.value = await $fetch(`/api/campaigns/${campaignId}/items`, { params }) as any[]
  } catch { itemList.value = [] }
}

async function create() {
  try {
    await $fetch(`/api/campaigns/${campaignId}/items`, { method: 'POST', body: form })
    showCreate.value = false
    form.name = ''
    form.description = ''
    await load()
  } catch (e: unknown) { alert((e as any)?.data?.message || 'Failed') }
}

onMounted(load)
</script>
