<template>
  <div class="p-8">
    <div v-if="entity">
      <!-- Breadcrumb -->
      <div class="flex items-center gap-2 text-sm text-muted-foreground mb-4">
        <NuxtLink :to="`/campaigns/${campaignId}`" class="hover:text-primary">Campaign</NuxtLink>
        <span>/</span>
        <NuxtLink :to="`/campaigns/${campaignId}/entities`" class="hover:text-primary">{{ $t('entities.title') }}</NuxtLink>
        <span>/</span>
        <span class="text-foreground">{{ entity.name }}</span>
      </div>

      <!-- Header with image -->
      <div class="flex items-start gap-6 mb-6">
        <EntityImage
          :image-url="entity.imageUrl ?? null"
          :name="entity.name"
          :editable="canEdit"
          :campaign-id="campaignId"
          :entity-slug="slug"
          size="lg"
          @uploaded="url => { if (entity) entity.imageUrl = url }"
        />
        <div class="flex-1 flex items-start justify-between">
        <div>
          <h1 class="text-3xl font-bold">{{ entity.name }}</h1>
          <div class="flex items-center gap-2 mt-2">
            <span class="text-xs px-2 py-1 rounded bg-secondary text-secondary-foreground">{{ entity.type }}</span>
            <span class="text-xs px-2 py-1 rounded bg-secondary text-secondary-foreground">{{ entity.visibility }}</span>
            <span v-for="tag in (entity.frontmatter?.tags || [])" :key="tag" class="text-xs px-2 py-1 rounded bg-primary/10 text-primary">{{ tag }}</span>
          </div>
        </div>
        <NuxtLink :to="`/campaigns/${campaignId}/entities/${slug}/edit`">
          <Button variant="outline" size="sm">{{ $t('common.edit') }}</Button>
        </NuxtLink>
      </div>
      </div>

      <!-- Frontmatter Fields -->
      <div v-if="entity.frontmatter?.aliases?.length" class="mb-4 p-3 rounded border border-border bg-muted/30">
        <span class="text-xs font-medium text-muted-foreground">{{ $t('entities.alsoKnownAs') }}</span>
        <span v-for="(alias, i) in entity.frontmatter.aliases" :key="alias" class="text-sm">
          {{ alias }}<span v-if="i < entity.frontmatter.aliases.length - 1">, </span>
        </span>
      </div>

      <!-- Markdown Content -->
      <div class="prose dark:prose-invert max-w-none text-foreground">
        <MDC v-if="entity.content" :value="entity.content" />
        <p v-else class="text-muted-foreground italic">{{ $t('entities.noContent') }}</p>
      </div>

      <!-- Child Entities -->
      <div v-if="children.length" class="mt-8 border-t border-border pt-6">
        <h2 class="text-lg font-semibold mb-3">{{ $t('entities.contains') }}</h2>
        <div class="space-y-1">
          <NuxtLink
            v-for="child in children"
            :key="child.id"
            :to="`/campaigns/${campaignId}/entities/${child.slug}`"
            class="block px-3 py-2 rounded text-sm hover:bg-accent transition-colors"
          >
            <span class="font-medium">{{ child.name }}</span>
            <span class="text-xs ml-2 text-muted-foreground">{{ child.type }}</span>
          </NuxtLink>
        </div>
      </div>
      <!-- Relationship Graph -->
      <div v-if="graphData && Object.keys(graphData.nodes).length" class="mt-8 border-t border-border pt-6">
        <h2 class="text-lg font-semibold mb-3">{{ $t('entities.relationships') }}</h2>
        <EntityGraphView
          :nodes="graphData.nodes"
          :edges="graphData.edges"
          :height="350"
          :campaign-id="campaignId"
          @node-click="onGraphNodeClick"
        />
      </div>

      <!-- Referenced By (mentions) -->
      <div v-if="mentions.length" class="mt-8 border-t border-border pt-6">
        <h2 class="text-lg font-semibold mb-3">{{ $t('entities.referencedBy') }}</h2>
        <div class="space-y-1">
          <NuxtLink
            v-for="m in mentions"
            :key="m.id"
            :to="`/campaigns/${campaignId}/entities/${m.sourceSlug}`"
            class="block px-3 py-2 rounded text-sm hover:bg-accent transition-colors"
          >
            <span class="font-medium">{{ m.sourceName }}</span>
            <span class="text-xs ml-2 text-muted-foreground">{{ m.sourceType }}</span>
            <span class="text-xs ml-2 text-muted-foreground">({{ m.count }} {{ $t('entities.mentions') }})</span>
          </NuxtLink>
        </div>
      </div>
    </div>
    <div v-else class="text-center py-16">
      <p class="text-muted-foreground">{{ $t('common.loading') }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">

const route = useRoute()
const campaignId = route.params.id as string
const slug = route.params.slug as string
const { t } = useI18n()

// Enable collaborative mode via ?collab=true query param
const isCollaborative = computed(() => route.query.collab === 'true')

import type { Entity, Mention } from '~/types/api'

const entity = ref<Entity | null>(null)
const children = ref<Entity[]>([])
const graphData = ref<any>(null)
const mentions = ref<Mention[]>([])
const canEdit = ref(false)
const api = useCampaignApi(campaignId)
const editing = ref(false)
const saving = ref(false)
const editForm = reactive({ name: '', content: '' })
const userName = ref('Anonymous')

// Fetch current user name for collaborative cursor
fetch('/api/auth/get-session', { credentials: 'include' })
  .then(r => r.json())
  .then(data => { if (data?.user?.name) userName.value = data.user.name })
  .catch(() => {})

async function loadEntity() {
  try {
    const [entityData, campaign] = await Promise.all([
      api.getEntity(slug),
      api.getCampaign().catch(() => null),
    ])
    entity.value = entityData
    canEdit.value = ['dm', 'co_dm', 'editor'].includes(campaign?.role ?? '')
    editForm.name = entity.value.name
    editForm.content = entity.value.content || ''
    // Load child entities
    if (entity.value?.id) {
      const result = await api.getEntities({ parent_id: entity.value.id })
      children.value = result.entities || []
    }
    // Load relationship graph for this entity
    if (entity.value?.id) {
      const relations = await api.getRelations({ entity_id: entity.value.id }).catch(() => [])
      const nodes: Record<string, { name: string; type: string }> = {}
      const edges: Record<string, { source: string; target: string; label: string; color: string }> = {}
      nodes[entity.value.id] = { name: entity.value.name, type: entity.value.type }
      for (const rel of relations) {
        nodes[rel.relatedEntityId || rel.targetEntityId] = { name: rel.relatedEntityId || rel.targetEntityId, type: 'entity' }
        edges[rel.id] = { source: rel.sourceEntityId, target: rel.targetEntityId, label: rel.label || rel.forwardLabel, color: '#9ca3af' }
      }
      graphData.value = relations.length ? { nodes, edges } : null
    }
    // Load mentions ("Referenced by")
    if (entity.value?.id) {
      mentions.value = await api.getMentions({ entity_id: entity.value.id }).catch(() => [])
    }
  } catch {
    entity.value = null
  }
}

async function saveEntity() {
  saving.value = true
  try {
    await api.updateEntity(slug, { name: editForm.name, content: editForm.content })
    await loadEntity()
    editing.value = false
  } catch (e: any) {
    alert(e.data?.message || t('entities.failedSave'))
  } finally {
    saving.value = false
  }
}

function onGraphNodeClick(nodeId: string) {
  // Navigate to the related entity -- nodeId is the entity ID
  // For now, we don't have slug lookup, so navigate to graph page
  navigateTo(`/campaigns/${campaignId}/graph`)
}

onMounted(loadEntity)
</script>
