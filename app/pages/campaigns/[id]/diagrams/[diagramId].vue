<template>
  <div class="flex flex-col h-screen">
    <!-- Toolbar -->
    <div
      class="flex items-center justify-between px-4 py-2 border-b border-border bg-background shrink-0"
    >
      <div class="flex items-center gap-2 text-sm text-muted-foreground">
        <NuxtLink :to="`/campaigns/${campaignId}`" class="hover:text-primary">
          {{ $t('common.campaign') }}
        </NuxtLink>
        <span>/</span>
        <NuxtLink :to="`/campaigns/${campaignId}/diagrams`" class="hover:text-primary">
          {{ $t('diagrams.title') }}
        </NuxtLink>
        <span>/</span>
        <span class="text-foreground font-medium">{{ diagram?.title }}</span>
      </div>

      <div v-if="!readOnly" class="flex items-center gap-2">
        <span v-if="saveStatus === 'saving'" class="text-xs text-muted-foreground">
          {{ $t('diagrams.saving') }}
        </span>
        <span v-else-if="saveStatus === 'saved'" class="text-xs text-green-600">
          {{ $t('diagrams.saved') }}
        </span>
        <Button
          size="sm"
          :disabled="saveStatus === 'saving'"
          data-testid="save-diagram-btn"
          @click="saveNow"
        >
          {{ $t('diagrams.save') }}
        </Button>
      </div>
    </div>

    <!-- Content -->
    <div class="flex flex-1 min-h-0">
      <!-- Entity Panel -->
      <EntityPanel
        v-if="!readOnly"
        :campaign-id="campaignId"
        :placed-entity-ids="placedEntityIds"
        @drag-start="onEntityDragStart"
      />

      <!-- Canvas Area -->
      <div class="flex-1 relative min-w-0">
        <LoadingSkeleton v-if="loading" class="absolute inset-0" />

        <div v-else-if="error" class="flex items-center justify-center h-full text-destructive">
          {{ $t('diagrams.errors.loadFailed') }}
        </div>

        <ClientOnly v-else>
          <TldrawCanvas
            :snapshot="snapshot"
            :read-only="readOnly"
            @save="onCanvasChangeWithCapture"
            @placed-entities-change="onPlacedEntitiesChange"
            @editor-ready="onEditorReady"
            @drop="onCanvasDrop"
          />
        </ClientOnly>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineAsyncComponent } from 'vue'

definePageMeta({ layout: 'empty' })

const TldrawCanvas = defineAsyncComponent(() => import('~/components/diagrams/TldrawCanvas.vue'))
const EntityPanel = defineAsyncComponent(() => import('~/components/diagrams/EntityPanel.vue'))

const route = useRoute()
const campaignId = route.params.id as string
const diagramId = route.params.diagramId as string

const diagram = ref<any>(null)
const snapshot = ref<Record<string, unknown> | undefined>(undefined)
const readOnly = ref(false)
const loading = ref(true)
const error = ref(false)
const saveStatus = ref<'idle' | 'saving' | 'saved'>('idle')
const placedEntityIds = ref(new Map<string, number>())

let editorInstance: unknown = null
let pendingEntityDrop: { entityData: string; event: DragEvent } | null = null
let saveTimer: ReturnType<typeof setTimeout> | null = null

async function load() {
  loading.value = true
  error.value = false
  try {
    const [campaignData, diagramData] = await Promise.all([
      $fetch<any>(`/api/campaigns/${campaignId}`),
      $fetch<any>(`/api/campaigns/${campaignId}/diagrams/${diagramId}`),
    ])

    const role = campaignData?.role ?? ''
    readOnly.value = !['dm', 'co_dm', 'editor'].includes(role)
    diagram.value = diagramData

    try {
      const snapshotData = await $fetch<any>(
        `/api/campaigns/${campaignId}/diagrams/${diagramId}/snapshot`,
      )
      snapshot.value = snapshotData.snapshot
    } catch (e: any) {
      if (e?.statusCode !== 404) throw e
      // No snapshot yet — empty canvas
    }
  } catch {
    error.value = true
  } finally {
    loading.value = false
  }
}

function onCanvasChange(newSnapshot: Record<string, unknown>) {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => autoSave(newSnapshot), 5000)
}

async function autoSave(snapshotData: Record<string, unknown>) {
  if (readOnly.value) return
  saveStatus.value = 'saving'
  try {
    await $fetch(`/api/campaigns/${campaignId}/diagrams/${diagramId}/snapshot`, {
      method: 'PUT',
      body: snapshotData,
    })
    saveStatus.value = 'saved'
    setTimeout(() => {
      saveStatus.value = 'idle'
    }, 2000)
  } catch {
    saveStatus.value = 'idle'
  }
}

let lastSnapshot: Record<string, unknown> | null = null

async function saveNow() {
  if (!lastSnapshot) return
  if (saveTimer) {
    clearTimeout(saveTimer)
    saveTimer = null
  }
  await autoSave(lastSnapshot)
}

function onCanvasChangeWithCapture(newSnapshot: Record<string, unknown>) {
  lastSnapshot = newSnapshot
  onCanvasChange(newSnapshot)
}

function onEditorReady(editor: unknown) {
  editorInstance = editor
  if (pendingEntityDrop) {
    handleEntityDrop(pendingEntityDrop.entityData, pendingEntityDrop.event)
    pendingEntityDrop = null
  }
}

function onPlacedEntitiesChange(counts: Map<string, number>) {
  placedEntityIds.value = counts
}

function onEntityDragStart(_entityData: string) {
  // dragstart data stored in dataTransfer on the entity card
}

function onCanvasDrop(event: DragEvent, editor: unknown) {
  editorInstance = editor
  const entityData = event.dataTransfer?.getData('application/aleph-entity')
  if (!entityData) return
  handleEntityDrop(entityData, event)
}

function handleEntityDrop(entityDataStr: string, event: DragEvent) {
  if (!editorInstance) {
    pendingEntityDrop = { entityData: entityDataStr, event }
    return
  }

  let entity: any
  try {
    entity = JSON.parse(entityDataStr)
  } catch {
    return
  }

  const editorAny = editorInstance as any
  const pagePoint = editorAny.screenToPage({ x: event.clientX, y: event.clientY })

  const shapeMap: Record<string, string> = {
    character: 'npcToken',
    location: 'locationPin',
    quest: 'questNode',
  }

  const shapeType = shapeMap[entity.type] ?? 'entityCard'

  const shapeProps: Record<string, unknown> = {
    entityId: entity.id,
    campaignId,
    slug: entity.slug ?? '',
  }

  if (shapeType === 'npcToken') {
    shapeProps.characterName = entity.name
    shapeProps.portraitUrl = entity.portraitUrl
  } else if (shapeType === 'locationPin') {
    shapeProps.locationName = entity.name
  } else if (shapeType === 'questNode') {
    shapeProps.questTitle = entity.name
    shapeProps.status = entity.status ?? 'planned'
  } else {
    shapeProps.entityName = entity.name
    shapeProps.entityType = entity.type
    shapeProps.portraitUrl = entity.portraitUrl
  }

  editorAny.createShape({
    type: shapeType,
    x: pagePoint.x - 100,
    y: pagePoint.y - 40,
    props: shapeProps,
  })
}

onMounted(load)
</script>
