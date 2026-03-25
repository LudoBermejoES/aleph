<template>
  <div class="p-8">
    <div class="flex items-center gap-2 text-sm text-muted-foreground mb-1">
      <NuxtLink :to="`/campaigns/${campaignId}`" class="hover:text-primary">Campaign</NuxtLink>
      <span>/</span><span>Shops</span>
    </div>
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold">Shops</h1>
      <Dialog v-model:open="showCreate">
        <DialogTrigger as-child><Button>New Shop</Button></DialogTrigger>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Shop</DialogTitle></DialogHeader>
          <form @submit.prevent="create" class="space-y-3">
            <Input v-model="form.name" placeholder="Shop name" required />
            <textarea v-model="form.description" rows="2" placeholder="Description..." class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
            <div class="flex justify-end gap-2">
              <Button type="button" variant="outline" @click="showCreate = false">Cancel</Button>
              <Button type="submit">Create</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
    <div v-if="shopList.length" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <Card v-for="shop in shopList" :key="shop.id" class="h-full">
        <CardHeader>
          <CardTitle class="text-lg">{{ shop.name }}</CardTitle>
          <CardDescription v-if="shop.description">{{ shop.description }}</CardDescription>
        </CardHeader>
      </Card>
    </div>
    <p v-else class="text-muted-foreground text-center py-8">No shops yet.</p>
  </div>
</template>

<script setup lang="ts">

const route = useRoute()
const campaignId = route.params.id as string
const shopList = ref<any[]>([])
const showCreate = ref(false)
const form = reactive({ name: '', description: '' })

async function load() {
  try { shopList.value = await $fetch(`/api/campaigns/${campaignId}/shops`) as any[] } catch { shopList.value = [] }
}

async function create() {
  try {
    await $fetch(`/api/campaigns/${campaignId}/shops`, { method: 'POST', body: form })
    showCreate.value = false
    form.name = ''
    await load()
  } catch (e: unknown) { alert((e as any)?.data?.message || 'Failed') }
}

onMounted(load)
</script>
