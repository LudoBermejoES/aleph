<template>
  <div class="p-8">
    <div class="flex items-center gap-2 text-sm text-muted-foreground mb-4">
      <NuxtLink :to="`/campaigns/${campaignId}`" class="hover:text-primary">{{
        $t('common.campaign')
      }}</NuxtLink>
      <span>/</span>
      <NuxtLink :to="`/campaigns/${campaignId}/characters`" class="hover:text-primary">{{
        $t('characters.title')
      }}</NuxtLink>
      <span>/</span>
      <NuxtLink :to="`/campaigns/${campaignId}/characters/${slug}`" class="hover:text-primary">{{
        characterName || slug
      }}</NuxtLink>
      <span>/</span>
      <span class="text-foreground">{{ $t('characters.genealogy.title') }}</span>
    </div>

    <div class="flex items-center justify-between mb-4 flex-wrap gap-y-2">
      <h1 class="text-2xl font-bold" data-testid="genealogy-title">
        {{ $t('characters.genealogy.title') }}
      </h1>
      <div class="flex gap-2">
        <Button variant="outline" size="sm" :disabled="loading" @click="recompute">
          {{ $t('characters.genealogy.recomputeLayout') }}
        </Button>
      </div>
    </div>

    <div v-if="warnings.length" class="mb-4 space-y-1">
      <p v-for="w in warnings" :key="w" class="text-sm text-yellow-600 dark:text-yellow-400">
        {{ w }}
      </p>
    </div>

    <div v-if="loading" class="flex items-center justify-center h-96 text-muted-foreground">
      {{ $t('common.loading') }}
    </div>
    <div
      v-else-if="!snapshot"
      class="flex items-center justify-center h-96 text-muted-foreground"
      data-testid="genealogy-empty"
    >
      {{ $t('characters.genealogy.emptyState') }}
    </div>
    <div
      v-else
      class="border border-border rounded"
      style="height: 600px"
      data-testid="genealogy-canvas"
    >
      <TldrawCanvas :snapshot="snapshot" @save="onSave" />
    </div>

    <!-- Recompute confirm overlay -->
    <div
      v-if="showRecomputeConfirm"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      data-testid="recompute-confirm"
    >
      <div class="bg-background border border-border rounded p-6 max-w-sm w-full space-y-4">
        <p class="text-sm">{{ $t('characters.genealogy.recomputeConfirm') }}</p>
        <div class="flex justify-end gap-2">
          <Button variant="outline" size="sm" @click="showRecomputeConfirm = false">{{
            $t('common.cancel')
          }}</Button>
          <Button size="sm" @click="doRecompute">{{ $t('common.confirm') }}</Button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { TLEditorSnapshot } from 'tldraw'

const route = useRoute()
const campaignId = route.params.id as string
const slug = route.params.slug as string

const loading = ref(true)
const snapshot = ref<Record<string, unknown> | undefined>(undefined)
const warnings = ref<string[]>([])
const characterName = ref('')
const showRecomputeConfirm = ref(false)

const storageKey = computed(() => `aleph:genealogy:${campaignId}:${slug}`)

async function fetchAndBuildSnapshot(depth = 3) {
  const data = await $fetch<{
    focus: { name: string }
    nodes: {
      entityId: string
      name: string
      slug: string
      x: number
      y: number
      generation: number
      birthYear?: number | null
      deathYear?: number | null
      gender?: string | null
      portraitUrl?: string | null
    }[]
    edges: { sourceEntityId: string; targetEntityId: string; type: string }[]
    warnings: string[]
  }>(`/api/campaigns/${campaignId}/characters/${slug}/genealogy?depth=${depth}`)

  characterName.value = data.focus.name
  warnings.value = data.warnings ?? []

  if (!data.nodes || data.nodes.length === 0) return undefined

  const NODE_W = 120
  const NODE_H = 160

  const shapes = data.nodes.map((node) => ({
    id: `shape:genealogy-${node.entityId}` as `shape:${string}`,
    type: 'genealogyNode',
    x: node.x,
    y: node.y,
    rotation: 0,
    isLocked: false,
    opacity: 1,
    meta: {},
    props: {
      w: NODE_W,
      h: NODE_H,
      entityId: node.entityId,
      campaignId,
      name: node.name,
      slug: node.slug,
      portraitUrl: node.portraitUrl ?? undefined,
      birthYear: node.birthYear ?? undefined,
      deathYear: node.deathYear ?? undefined,
      gender: node.gender ?? undefined,
      isFocus: node.slug === slug,
    },
    parentId: 'page:page' as `page:${string}`,
    index: 'a1' as `a${string}`,
    typeName: 'shape' as const,
  }))

  const entityIdToShapeId = new Map(
    data.nodes.map((n) => [n.entityId, `shape:genealogy-${n.entityId}`]),
  )

  const arrowEdges = data.edges
    .filter((e) => e.type === 'parent_of')
    .map((e, i) => ({
      arrowId: `shape:genealogy-arrow-${i}` as `shape:${string}`,
      sourceShapeId: entityIdToShapeId.get(e.sourceEntityId),
      targetShapeId: entityIdToShapeId.get(e.targetEntityId),
      index: i,
    }))
    .filter((a) => a.sourceShapeId && a.targetShapeId)

  const arrows = arrowEdges.map((a) => ({
    id: a.arrowId,
    type: 'arrow',
    x: 0,
    y: 0,
    rotation: 0,
    isLocked: false,
    opacity: 1,
    meta: {},
    props: {
      kind: 'arc',
      dash: 'draw',
      size: 'm',
      fill: 'none',
      color: 'black',
      labelColor: 'black',
      bend: 0,
      start: { x: 0, y: 0 },
      end: { x: 100, y: 0 },
      arrowheadStart: 'none',
      arrowheadEnd: 'arrow',
      richText: { type: 'doc', content: [] },
      labelPosition: 0.5,
      font: 'draw',
      scale: 1,
      elbowMidPoint: 0.5,
    },
    parentId: 'page:page' as `page:${string}`,
    index: `a${a.index + 2}` as `a${string}`,
    typeName: 'shape' as const,
  }))

  // tldraw v3: arrow→shape connections are separate `binding` records, not inline props
  const bindings = arrowEdges.flatMap((a) => [
    {
      id: `binding:genealogy-bind-start-${a.index}` as `binding:${string}`,
      typeName: 'binding' as const,
      type: 'arrow',
      fromId: a.arrowId,
      toId: a.sourceShapeId!,
      meta: {},
      props: {
        terminal: 'start',
        normalizedAnchor: { x: 0.5, y: 1 },
        isExact: false,
        isPrecise: false,
      },
    },
    {
      id: `binding:genealogy-bind-end-${a.index}` as `binding:${string}`,
      typeName: 'binding' as const,
      type: 'arrow',
      fromId: a.arrowId,
      toId: a.targetShapeId!,
      meta: {},
      props: {
        terminal: 'end',
        normalizedAnchor: { x: 0.5, y: 0 },
        isExact: false,
        isPrecise: false,
      },
    },
  ])

  const tldrawSnapshot: TLEditorSnapshot = {
    document: {
      store: {
        'document:document': {
          gridSize: 10,
          name: '',
          meta: {},
          id: 'document:document',
          typeName: 'document',
        },
        'page:page': {
          meta: {},
          id: 'page:page',
          name: 'Page 1',
          index: 'a1',
          typeName: 'page',
        },
        ...Object.fromEntries(shapes.map((s) => [s.id, s])),
        ...Object.fromEntries(arrows.map((a) => [a.id, a])),
        ...Object.fromEntries(bindings.map((b) => [b.id, b])),
      },
      schema: {
        schemaVersion: 2,
        sequences: {},
      },
    },
    session: {
      version: 0,
      currentPageId: 'page:page',
      exportBackground: true,
      isDebugMode: false,
      isFocusMode: false,
      isGridMode: false,
      isToolLocked: false,
      pageStates: [
        {
          pageId: 'page:page',
          camera: { x: 0, y: 0, z: 1 },
          selectedShapeIds: [],
          focusedGroupId: null,
        },
      ],
    },
  }

  return tldrawSnapshot as unknown as Record<string, unknown>
}

async function load() {
  loading.value = true
  try {
    const saved = localStorage.getItem(storageKey.value)
    if (saved) {
      snapshot.value = JSON.parse(saved)
      // Still fetch to get characterName and warnings
      const data = await $fetch<{ focus: { name: string }; warnings: string[] }>(
        `/api/campaigns/${campaignId}/characters/${slug}/genealogy?depth=3`,
      )
      characterName.value = data.focus.name
      warnings.value = data.warnings ?? []
    } else {
      snapshot.value = await fetchAndBuildSnapshot()
    }
  } catch (e: unknown) {
    const err = e as { statusCode?: number }
    if (err.statusCode !== 404) {
      snapshot.value = undefined
    }
  } finally {
    loading.value = false
  }
}

function onSave(s: Record<string, unknown>) {
  localStorage.setItem(storageKey.value, JSON.stringify(s))
  snapshot.value = s
}

function recompute() {
  showRecomputeConfirm.value = true
}

async function doRecompute() {
  showRecomputeConfirm.value = false
  loading.value = true
  try {
    const newSnapshot = await fetchAndBuildSnapshot()
    if (newSnapshot) {
      localStorage.setItem(storageKey.value, JSON.stringify(newSnapshot))
    } else {
      localStorage.removeItem(storageKey.value)
    }
    snapshot.value = newSnapshot
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>
