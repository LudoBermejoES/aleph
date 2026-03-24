<template>
  <div class="p-8">
    <div v-if="entity">
      <!-- Breadcrumb -->
      <div class="flex items-center gap-2 text-sm text-muted-foreground mb-4">
        <NuxtLink :to="`/campaigns/${campaignId}`" class="hover:text-primary">Campaign</NuxtLink>
        <span>/</span>
        <NuxtLink :to="`/campaigns/${campaignId}/entities`" class="hover:text-primary">Wiki</NuxtLink>
        <span>/</span>
        <span class="text-foreground">{{ entity.name }}</span>
      </div>

      <!-- Header -->
      <div class="flex items-start justify-between mb-6">
        <div>
          <h1 class="text-3xl font-bold">{{ entity.name }}</h1>
          <div class="flex items-center gap-2 mt-2">
            <span class="text-xs px-2 py-1 rounded bg-secondary text-secondary-foreground">{{ entity.type }}</span>
            <span class="text-xs px-2 py-1 rounded bg-secondary text-secondary-foreground">{{ entity.visibility }}</span>
            <span v-for="tag in (entity.frontmatter?.tags || [])" :key="tag" class="text-xs px-2 py-1 rounded bg-primary/10 text-primary">{{ tag }}</span>
          </div>
        </div>
        <div class="flex gap-2">
          <Button variant="outline" size="sm" @click="editing = !editing">
            {{ editing ? 'Cancel' : 'Edit' }}
          </Button>
        </div>
      </div>

      <!-- Frontmatter Fields -->
      <div v-if="entity.frontmatter?.aliases?.length" class="mb-4 p-3 rounded border border-border bg-muted/30">
        <span class="text-xs font-medium text-muted-foreground">Also known as: </span>
        <span v-for="(alias, i) in entity.frontmatter.aliases" :key="alias" class="text-sm">
          {{ alias }}<span v-if="i < entity.frontmatter.aliases.length - 1">, </span>
        </span>
      </div>

      <!-- Edit Mode -->
      <div v-if="editing" class="space-y-4 mb-6">
        <div class="space-y-2">
          <label class="text-sm font-medium">Name</label>
          <Input v-model="editForm.name" />
        </div>
        <div class="space-y-2">
          <label class="text-sm font-medium">Content (Markdown)</label>
          <textarea v-model="editForm.content" rows="15" class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"></textarea>
        </div>
        <Button @click="saveEntity" :disabled="saving">{{ saving ? 'Saving...' : 'Save' }}</Button>
      </div>

      <!-- Markdown Content -->
      <div v-else class="prose dark:prose-invert max-w-none">
        <MDC v-if="entity.content" :value="entity.content" />
        <p v-else class="text-muted-foreground italic">No content yet. Click Edit to add some.</p>
      </div>

      <!-- Child Entities -->
      <div v-if="children.length" class="mt-8 border-t border-border pt-6">
        <h2 class="text-lg font-semibold mb-3">Contains</h2>
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
        <h2 class="text-lg font-semibold mb-3">Relationships</h2>
        <EntityGraphView
          :nodes="graphData.nodes"
          :edges="graphData.edges"
          :height="350"
          :campaign-id="campaignId"
          @node-click="onGraphNodeClick"
        />
      </div>
    </div>
    <div v-else class="text-center py-16">
      <p class="text-muted-foreground">Loading...</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'

const route = useRoute()
const campaignId = route.params.id as string
const slug = route.params.slug as string

const entity = ref<any>(null)
const children = ref<any[]>([])
const graphData = ref<any>(null)
const editing = ref(false)
const saving = ref(false)
const editForm = reactive({ name: '', content: '' })

async function loadEntity() {
  try {
    entity.value = await $fetch(`/api/campaigns/${campaignId}/entities/${slug}`)
    editForm.name = entity.value.name
    editForm.content = entity.value.content || ''
    // Load child entities
    if (entity.value?.id) {
      const result = await $fetch(`/api/campaigns/${campaignId}/entities`, {
        params: { parent_id: entity.value.id },
      }) as any
      children.value = result.entities || []
    }
    // Load relationship graph for this entity
    if (entity.value?.id) {
      try {
        const relations = await $fetch(`/api/campaigns/${campaignId}/relations`, {
          params: { entity_id: entity.value.id },
        }) as any[]
        // Build mini graph from entity-centered relations
        const nodes: Record<string, { name: string; type: string }> = {}
        const edges: Record<string, { source: string; target: string; label: string; color: string }> = {}
        nodes[entity.value.id] = { name: entity.value.name, type: entity.value.type }
        for (const rel of relations) {
          nodes[rel.relatedEntityId] = { name: rel.relatedEntityId, type: 'entity' }
          edges[rel.id] = {
            source: rel.sourceEntityId,
            target: rel.targetEntityId,
            label: rel.label,
            color: '#9ca3af',
          }
        }
        graphData.value = relations.length ? { nodes, edges } : null
      } catch { graphData.value = null }
    }
  } catch {
    entity.value = null
  }
}

async function saveEntity() {
  saving.value = true
  try {
    await $fetch(`/api/campaigns/${campaignId}/entities/${slug}`, {
      method: 'PUT',
      body: { name: editForm.name, content: editForm.content },
    })
    await loadEntity()
    editing.value = false
  } catch (e: any) {
    alert(e.data?.message || 'Failed to save')
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
