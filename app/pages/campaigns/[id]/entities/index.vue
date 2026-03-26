<template>
  <div class="p-8">
    <div class="flex items-center justify-between mb-6">
      <div>
        <div class="flex items-center gap-2 text-sm text-muted-foreground mb-1">
          <NuxtLink :to="`/campaigns/${campaignId}`" class="hover:text-primary">Campaign</NuxtLink>
          <span>/</span>
          <span>{{ $t('entities.title') }}</span>
        </div>
        <h1 class="text-2xl font-bold">{{ $t('entities.subtitle') }}</h1>
      </div>
      <NuxtLink :to="`/campaigns/${campaignId}/entities/new`">
        <Button data-testid="new-entity-btn">{{ $t('entities.new') }}</Button>
      </NuxtLink>
    </div>

    <!-- Filters -->
    <div class="flex gap-3 mb-6">
      <select v-model="filters.type" @change="loadEntities" class="rounded-md border border-input bg-background px-3 py-2 text-sm">
        <option value="">{{ $t('entities.allTypes') }}</option>
        <option v-for="t in entityTypes" :key="t.slug" :value="t.slug">{{ t.name }}</option>
      </select>
      <Input v-model="filters.search" :placeholder="$t('entities.filterPlaceholder')" class="max-w-xs" @input="debouncedSearch" />
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
    <p v-else-if="!loading" class="text-muted-foreground text-center py-8">{{ $t('entities.empty') }}</p>

    <!-- Pagination -->
    <div v-if="pagination.totalPages > 1" class="flex justify-center gap-2 mt-6">
      <Button variant="outline" size="sm" :disabled="pagination.page <= 1" @click="goToPage(pagination.page - 1)">{{ $t('common.previous') }}</Button>
      <span class="text-sm text-muted-foreground py-2">{{ pagination.page }} / {{ pagination.totalPages }}</span>
      <Button variant="outline" size="sm" :disabled="pagination.page >= pagination.totalPages" @click="goToPage(pagination.page + 1)">{{ $t('common.next') }}</Button>
    </div>
  </div>
</template>

<script setup lang="ts">

const route = useRoute()
const campaignId = route.params.id as string

import type { Entity, EntityType } from '~/types/api'

const entities = ref<Entity[]>([])
const entityTypes = ref<EntityType[]>([])
const loading = ref(true)
const filters = reactive({ type: '', search: '' })
const pagination = reactive({ page: 1, limit: 50, total: 0, totalPages: 0 })
const api = useCampaignApi(campaignId)

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

    const result = await api.getEntities(params)
    entities.value = result.entities
    Object.assign(pagination, result.pagination)
  } catch {
    entities.value = []
  } finally {
    loading.value = false
  }
}

async function loadEntityTypes() {
  entityTypes.value = await api.getEntityTypes().catch(() => [])
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
