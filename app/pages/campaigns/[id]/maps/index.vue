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
            <div class="flex justify-end gap-2">
              <Button type="button" variant="outline" @click="showCreate = false">Cancel</Button>
              <Button type="submit">Create</Button>
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
import { Card, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '~/components/ui/dialog'

const route = useRoute()
const campaignId = route.params.id as string
const mapList = ref<any[]>([])
const showCreate = ref(false)
const form = reactive({ name: '' })

async function load() {
  try { mapList.value = await $fetch(`/api/campaigns/${campaignId}/maps?root=true`) as any[] } catch { mapList.value = [] }
}

async function create() {
  try {
    const res = await $fetch(`/api/campaigns/${campaignId}/maps`, { method: 'POST', body: form }) as any
    showCreate.value = false
    navigateTo(`/campaigns/${campaignId}/maps/${res.slug}`)
  } catch (e: any) { alert(e.data?.message || 'Failed') }
}

onMounted(load)
</script>
