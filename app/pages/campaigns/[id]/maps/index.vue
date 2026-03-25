<template>
  <div class="p-8">
    <div class="flex items-center gap-2 text-sm text-muted-foreground mb-1">
      <NuxtLink :to="`/campaigns/${campaignId}`" class="hover:text-primary">Campaign</NuxtLink>
      <span>/</span>
      <span>Maps</span>
    </div>

    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold">Maps</h1>
      <Dialog v-model:open="showCreate">
        <DialogTrigger as-child>
          <Button>New Map</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Map</DialogTitle></DialogHeader>
          <form @submit.prevent="create" class="space-y-4">
            <Input v-model="form.name" placeholder="Map name" required />
            <div class="space-y-2">
              <label class="text-sm font-medium">Map Image (optional)</label>
              <input ref="fileInput" type="file" accept="image/png,image/jpeg,image/webp" class="block w-full text-sm border border-input rounded-md p-2" />
            </div>
            <div class="flex justify-end gap-2">
              <Button type="button" variant="outline" @click="showCreate = false">Cancel</Button>
              <Button type="submit" :disabled="creating">{{ creating ? 'Creating...' : 'Create' }}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>

    <div v-if="mapList.length" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <NuxtLink v-for="m in mapList" :key="m.id" :to="`/campaigns/${campaignId}/maps/${m.slug}`">
        <Card class="hover:border-primary/50 transition-colors cursor-pointer h-full">
          <CardHeader>
            <CardTitle class="text-lg">{{ m.name }}</CardTitle>
            <CardDescription v-if="m.width">{{ m.width }}x{{ m.height }}px</CardDescription>
          </CardHeader>
        </Card>
      </NuxtLink>
    </div>
    <p v-else class="text-muted-foreground text-center py-8">No maps yet. Create one to get started.</p>
  </div>
</template>

<script setup lang="ts">

const route = useRoute()
const campaignId = route.params.id as string
const mapList = ref<any[]>([])
const showCreate = ref(false)
const creating = ref(false)
const form = reactive({ name: '' })
const fileInput = ref<HTMLInputElement>()

async function load() {
  try { mapList.value = await $fetch(`/api/campaigns/${campaignId}/maps?root=true`) as any[] } catch { mapList.value = [] }
}

async function create() {
  creating.value = true
  try {
    // Create map
    const res = await $fetch(`/api/campaigns/${campaignId}/maps`, { method: 'POST', body: form }) as any
    const slug = res.slug

    // Upload image if selected
    const file = fileInput.value?.files?.[0]
    if (file) {
      const formData = new FormData()
      formData.append('image', file)
      await $fetch(`/api/campaigns/${campaignId}/maps/${slug}/upload`, {
        method: 'POST',
        body: formData,
      })
    }

    showCreate.value = false
    form.name = ''
    navigateTo(`/campaigns/${campaignId}/maps/${slug}`)
  } catch (e: unknown) {
    alert((e as { data?: { message?: string } })?.data?.message || 'Failed')
  } finally {
    creating.value = false
  }
}

onMounted(load)
</script>
