<template>
  <div class="p-8">
    <div class="flex items-center justify-between mb-6">
      <div>
        <div class="flex items-center gap-2 text-sm text-muted-foreground mb-1">
          <NuxtLink :to="`/campaigns/${campaignId}`" class="hover:text-primary">Campaign</NuxtLink>
          <span>/</span>
          <span>Wiki</span>
        </div>
        <h1 class="text-2xl font-bold">Entities</h1>
      </div>
      <Dialog v-model:open="showCreateDialog">
        <DialogTrigger as-child>
          <Button>New Entity</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Entity</DialogTitle>
          </DialogHeader>
          <form @submit.prevent="createEntity" class="space-y-4">
            <div class="space-y-2">
              <label class="text-sm font-medium">Name</label>
              <Input v-model="newEntity.name" placeholder="Strahd von Zarovich" required />
            </div>
            <div class="space-y-2">
              <label class="text-sm font-medium">Type</label>
              <select v-model="newEntity.type" class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option v-for="t in entityTypes" :key="t.slug" :value="t.slug">{{ t.name }}</option>
              </select>
            </div>
            <div class="space-y-2">
              <label class="text-sm font-medium">Content (Markdown)</label>
              <textarea v-model="newEntity.content" rows="5" class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="# Description..."></textarea>
            </div>
            <div class="flex justify-end gap-2">
              <Button type="button" variant="outline" @click="showCreateDialog = false">Cancel</Button>
              <Button type="submit" :disabled="creating">{{ creating ? 'Creating...' : 'Create' }}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>

    <!-- Search Command -->
    <div class="mb-6 max-w-xs">
      <SearchCommand :campaign-id="campaignId" />
    </div>

    <!-- Filters -->
    <div class="flex gap-3 mb-6">
      <select v-model="filters.type" @change="loadEntities" class="rounded-md border border-input bg-background px-3 py-2 text-sm">
        <option value="">All Types</option>
        <option v-for="t in entityTypes" :key="t.slug" :value="t.slug">{{ t.name }}</option>
      </select>
      <Input v-model="filters.search" placeholder="Filter by name..." class="max-w-xs" @input="debouncedSearch" />
    </div>

    <!-- Entity List -->
    <div v-if="entities.length" class="space-y-2">
      <NuxtLink
        v-for="entity in entities"
        :key="entity.id"
        :to="`/campaigns/${campaignId}/entities/${entity.slug}`"
        class="block p-4 rounded-lg border border-border hover:border-primary/50 transition-colors"
      >
        <div class="flex items-center justify-between">
          <div>
            <span class="font-medium">{{ entity.name }}</span>
            <span class="text-xs ml-2 px-2 py-0.5 rounded bg-secondary text-secondary-foreground">{{ entity.type }}</span>
          </div>
          <span class="text-xs text-muted-foreground">{{ entity.visibility }}</span>
        </div>
      </NuxtLink>
    </div>
    <p v-else-if="!loading" class="text-muted-foreground text-center py-8">No entities yet.</p>

    <!-- Pagination -->
    <div v-if="pagination.totalPages > 1" class="flex justify-center gap-2 mt-6">
      <Button variant="outline" size="sm" :disabled="pagination.page <= 1" @click="goToPage(pagination.page - 1)">Previous</Button>
      <span class="text-sm text-muted-foreground py-2">{{ pagination.page }} / {{ pagination.totalPages }}</span>
      <Button variant="outline" size="sm" :disabled="pagination.page >= pagination.totalPages" @click="goToPage(pagination.page + 1)">Next</Button>
    </div>
  </div>
</template>

<script setup lang="ts">

const route = useRoute()
const campaignId = route.params.id as string

const entities = ref<any[]>([])
const entityTypes = ref<any[]>([])
const loading = ref(true)
const showCreateDialog = ref(false)
const creating = ref(false)
const newEntity = reactive({ name: '', type: 'character', content: '' })
const filters = reactive({ type: '', search: '' })
const pagination = reactive({ page: 1, limit: 50, total: 0, totalPages: 0 })

let searchTimeout: ReturnType<typeof setTimeout>
function debouncedSearch() {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(loadEntities, 300)
}

async function loadEntities() {
  loading.value = true
  try {
    const params: Record<string, string> = {
      page: String(pagination.page),
      limit: String(pagination.limit),
    }
    if (filters.type) params.type = filters.type
    if (filters.search) params.search = filters.search

    const result = await $fetch(`/api/campaigns/${campaignId}/entities`, { params }) as any
    entities.value = result.entities
    Object.assign(pagination, result.pagination)
  } catch {
    entities.value = []
  } finally {
    loading.value = false
  }
}

async function loadEntityTypes() {
  try {
    entityTypes.value = await $fetch(`/api/campaigns/${campaignId}/entity-types`) as any[]
  } catch {
    entityTypes.value = []
  }
}

async function createEntity() {
  creating.value = true
  try {
    const result = await $fetch(`/api/campaigns/${campaignId}/entities`, {
      method: 'POST',
      body: newEntity,
    })
    showCreateDialog.value = false
    newEntity.name = ''
    newEntity.content = ''
    navigateTo(`/campaigns/${campaignId}/entities/${(result as any).slug}`)
  } catch (e: any) {
    alert(e.data?.message || 'Failed to create entity')
  } finally {
    creating.value = false
  }
}

function goToPage(page: number) {
  pagination.page = page
  loadEntities()
}

onMounted(() => {
  loadEntityTypes()
  loadEntities()
})
</script>
