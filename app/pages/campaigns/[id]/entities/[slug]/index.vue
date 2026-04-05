<template>
  <div class="p-8">
    <LoadingSkeleton v-if="loading" :rows="4" />
    <div v-else-if="entity">
      <!-- Breadcrumb -->
      <div class="flex items-center gap-2 text-sm text-muted-foreground mb-4">
        <NuxtLink :to="`/campaigns/${campaignId}`" class="hover:text-primary">
          {{ $t('common.campaign') }}</NuxtLink
        >
        <span>/</span>
        <NuxtLink :to="`/campaigns/${campaignId}/entities`" class="hover:text-primary">{{
          $t('entities.title')
        }}</NuxtLink>
        <span>/</span>
        <span class="text-foreground">{{ entity.name }}</span>
      </div>

      <!-- Preview role switcher (DM only) -->
      <EntityPreviewRoleSwitcher
        v-if="campaignRole"
        :campaign-role="campaignRole"
        @change="onPreviewRoleChange"
      />

      <!-- Header with image -->
      <div class="flex items-start gap-6 mb-6">
        <EntityImage
          :image-url="entity.imageUrl ?? null"
          :name="entity.name"
          :editable="canEdit"
          :campaign-id="campaignId"
          :entity-slug="slug"
          size="lg"
          @uploaded="
            (url) => {
              if (entity) entity.imageUrl = url
            }
          "
        />
        <div class="flex-1 flex items-start justify-between">
          <div>
            <h1 class="text-3xl font-bold">{{ entity.name }}</h1>
            <div class="flex items-center gap-2 mt-2">
              <span class="text-xs px-2 py-1 rounded bg-secondary text-secondary-foreground">{{
                entity.type
              }}</span>
              <span class="text-xs px-2 py-1 rounded bg-secondary text-secondary-foreground">{{
                entity.visibility
              }}</span>
              <span
                v-for="tag in entity.frontmatter?.tags || []"
                :key="tag"
                class="text-xs px-2 py-1 rounded bg-primary/10 text-primary"
                >{{ tag }}</span
              >
            </div>
          </div>
          <div class="flex gap-2">
            <NuxtLink :to="`/campaigns/${campaignId}/entities/${slug}/edit`">
              <Button variant="outline" size="sm">{{ $t('common.edit') }}</Button>
            </NuxtLink>
            <NuxtLink
              v-if="canEdit"
              :to="`/campaigns/${campaignId}/entities/${slug}/edit?collab=true`"
            >
              <Button variant="outline" size="sm">{{ $t('collaboration.collaborate') }}</Button>
            </NuxtLink>
          </div>
        </div>
      </div>

      <!-- Frontmatter Fields -->
      <div
        v-if="entity.frontmatter?.aliases?.length"
        class="mb-4 p-3 rounded border border-border bg-muted/30"
      >
        <span class="text-xs font-medium text-muted-foreground">{{
          $t('entities.alsoKnownAs')
        }}</span>
        <span v-for="(alias, i) in entity.frontmatter.aliases" :key="alias" class="text-sm">
          {{ alias }}<span v-if="i < entity.frontmatter.aliases.length - 1">, </span>
        </span>
      </div>

      <!-- Markdown Content -->
      <div ref="contentRef" class="prose dark:prose-invert max-w-none text-foreground">
        <MDC v-if="previewContent !== null" :value="previewContent" />
        <MDC v-else-if="entity.content" :value="entity.content" />
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
      <div
        v-if="graphData && Object.keys(graphData.nodes).length"
        class="mt-8 border-t border-border pt-6"
      >
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
            <span class="text-xs ml-2 text-muted-foreground"
              >({{ m.count }} {{ $t('entities.mentions') }})</span
            >
          </NuxtLink>
        </div>
      </div>

      <!-- Secret Notes (DM only) -->
      <EntitySecretNotes
        v-if="campaignRole"
        :campaign-id="campaignId"
        :entity-slug="slug"
        :campaign-role="campaignRole"
      />
    </div>
    <div v-else class="text-center py-16">
      <p class="text-muted-foreground">{{ $t('entities.notFound') }}</p>
    </div>
    <ErrorToast v-if="error" :message="error" @dismiss="error = null" />
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const campaignId = route.params.id as string
const slug = route.params.slug as string
const { t } = useI18n()
const campaignRole = ref<string>('')
const previewContent = ref<string | null>(null)
const contentRef = ref<HTMLElement>()
const revealedBlocks = ref<Set<string>>(new Set())

import type { Entity, Mention } from '~/types/api'

const entity = ref<Entity | null>(null)
const children = ref<Entity[]>([])
const graphData = ref<any>(null)
const mentions = ref<Mention[]>([])
const canEdit = ref(false)
const api = useCampaignApi(campaignId)
const { loading, error, withLoading } = useLoadingState()

async function loadEntity() {
  await withLoading(async () => {
    const [entityData, campaign] = await Promise.all([
      api.getEntity(slug),
      api.getCampaign().catch(() => null),
    ])
    entity.value = entityData
    canEdit.value = ['dm', 'co_dm', 'editor'].includes(campaign?.role ?? '')
    campaignRole.value = campaign?.role ?? ''
    // Load child entities
    if (entity.value?.id) {
      const result = await api.getEntities({ parent_id: entity.value.id })
      children.value = result.entities || []
    }
    // Load relationship graph for this entity
    if (entity.value?.id) {
      const relations = await api.getRelations({ entity_id: entity.value.id }).catch(() => [])
      const nodes: Record<string, { name: string; type: string }> = {}
      const edges: Record<
        string,
        { source: string; target: string; label: string; color: string }
      > = {}
      nodes[entity.value.id] = { name: entity.value.name, type: entity.value.type }
      for (const rel of relations) {
        nodes[rel.relatedEntityId || rel.targetEntityId] = {
          name: rel.relatedEntityId || rel.targetEntityId,
          type: 'entity',
        }
        edges[rel.id] = {
          source: rel.sourceEntityId,
          target: rel.targetEntityId,
          label: rel.label || rel.forwardLabel,
          color: '#9ca3af',
        }
      }
      graphData.value = relations.length ? { nodes, edges } : null
    }
    // Load mentions ("Referenced by")
    if (entity.value?.id) {
      mentions.value = await api.getMentions({ entity_id: entity.value.id }).catch(() => [])
    }
  })
}

async function onPreviewRoleChange(role: string | null) {
  if (!role) {
    previewContent.value = null
    return
  }
  try {
    const res = await fetch(
      `/api/campaigns/${campaignId}/entities/${slug}/render?preview_as=${role}`,
      {
        credentials: 'include',
      },
    )
    if (res.ok) {
      const data = await res.json()
      previewContent.value = data.content
    }
  } catch {
    /* silently ignore */
  }
}

function onGraphNodeClick(nodeId: string) {
  // Navigate to the related entity -- nodeId is the entity ID
  // For now, we don't have slug lookup, so navigate to graph page
  navigateTo(`/campaigns/${campaignId}/graph`)
}

// Load revealed secret block IDs for DM view
async function loadRevealedBlocks() {
  if (!['dm', 'co_dm'].includes(campaignRole.value)) return
  try {
    const res = await fetch(`/api/campaigns/${campaignId}/entities/${slug}/secrets`, {
      credentials: 'include',
    })
    if (res.ok) {
      const data = await res.json()
      revealedBlocks.value = new Set(data.map((r: any) => r.blockId))
    }
  } catch {
    /* silently ignore */
  }
}

// Inject reveal buttons into secret blocks after render
function injectRevealButtons() {
  if (!contentRef.value || !['dm', 'co_dm'].includes(campaignRole.value)) return
  const blocks = contentRef.value.querySelectorAll('[data-secret][data-secret-id]')
  for (const block of blocks) {
    const blockId = block.getAttribute('data-secret-id')!
    if (block.querySelector('[data-reveal-btn]')) continue // already injected
    const btn = document.createElement('button')
    btn.setAttribute('data-reveal-btn', blockId)
    const isRevealed = revealedBlocks.value.has(blockId)
    btn.className = `text-xs px-2 py-0.5 rounded font-medium transition-colors ml-2 ${isRevealed ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-amber-100 text-amber-700 hover:bg-amber-200'}`
    btn.textContent = isRevealed ? t('secrets.unreveal') : t('secrets.reveal')
    btn.addEventListener('click', async () => {
      const revealed = revealedBlocks.value.has(blockId)
      if (revealed) {
        await fetch(`/api/campaigns/${campaignId}/entities/${slug}/secrets/${blockId}`, {
          method: 'DELETE',
          credentials: 'include',
        })
        revealedBlocks.value = new Set([...revealedBlocks.value].filter((id) => id !== blockId))
      } else {
        await fetch(`/api/campaigns/${campaignId}/entities/${slug}/secrets`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ blockId }),
        })
        revealedBlocks.value = new Set([...revealedBlocks.value, blockId])
      }
      // Re-inject after state change
      block.querySelector('[data-reveal-btn]')?.remove()
      injectRevealButtons()
    })
    block.prepend(btn)
  }
}

onMounted(async () => {
  await loadEntity()
  await loadRevealedBlocks()
  await nextTick()
  injectRevealButtons()
})

watch(revealedBlocks, async () => {
  await nextTick()
  // Remove all existing buttons and re-inject with updated state
  contentRef.value?.querySelectorAll('[data-reveal-btn]').forEach((b) => b.remove())
  injectRevealButtons()
})
</script>
