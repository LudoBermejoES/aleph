<template>
  <div class="flex flex-col h-screen">
    <!-- Toolbar -->
    <div
      class="flex flex-wrap items-center justify-between gap-2 px-4 py-2 border-b border-border bg-background shrink-0"
    >
      <div class="flex items-center gap-2 text-sm text-muted-foreground shrink-0">
        <NuxtLink :to="`/campaigns/${campaignId}`" class="hover:text-primary">
          {{ $t('common.campaign') }}
        </NuxtLink>
        <span>/</span>
        <NuxtLink :to="`/campaigns/${campaignId}/diagrams`" class="hover:text-primary">
          {{ $t('diagrams.title') }}
        </NuxtLink>
        <span>/</span>
        <span class="text-foreground font-medium truncate max-w-[200px]">{{ diagram?.title }}</span>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <!-- Type filter buttons -->
        <div class="flex gap-1">
          <Button
            v-for="f in filterOptions"
            :key="f.value"
            size="xs"
            :variant="filterType === f.value ? 'default' : 'outline'"
            @click="setFilter(f.value)"
          >
            {{ f.label }}
          </Button>
        </div>

        <div v-if="!readOnly" class="flex flex-wrap items-center gap-2">
          <span v-if="saveStatus === 'saving'" class="text-xs text-muted-foreground">
            {{ $t('diagrams.saving') }}
          </span>
          <span v-else-if="saveStatus === 'saved'" class="text-xs text-green-600">
            {{ $t('diagrams.saved') }}
          </span>

          <!-- Reflow button -->
          <Button size="sm" variant="outline" data-testid="reflow-btn" @click="reflowShapes">
            {{ $t('diagrams.reflow') }}
          </Button>

          <!-- Add Relationship button (visible when entity selected) -->
          <Button
            v-if="selectedEntityId"
            size="sm"
            variant="default"
            data-testid="add-relationship-btn"
            @click="relationshipDialogOpen = true"
          >
            {{ $t('diagrams.addRelationship') }}
          </Button>

          <!-- Expand related entities button (org/location only) -->
          <Button
            v-if="selectedEntityType === 'organization' || selectedEntityType === 'location'"
            size="sm"
            variant="outline"
            data-testid="expand-entity-btn"
            @click="expandRelatedEntities"
          >
            {{ $t('diagrams.expand') }}
          </Button>

          <!-- Sync Relations button -->
          <Button
            size="sm"
            variant="outline"
            data-testid="sync-relations-btn"
            @click="syncRelations"
          >
            {{ $t('diagrams.syncRelations') }}
          </Button>

          <input
            ref="tldrFileInputRef"
            type="file"
            accept=".tldr"
            class="hidden"
            data-testid="tldr-file-input"
            @change="onTldrFileSelected"
          />
          <Button
            size="sm"
            variant="outline"
            data-testid="import-tldr-btn"
            @click="tldrFileInputRef?.click()"
          >
            {{ $t('diagrams.importTldr') }}
          </Button>
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
    </div>

    <!-- Content -->
    <div class="flex flex-1 min-h-0">
      <!-- Entity Panel -->
      <EntityPanel
        v-if="!readOnly && !loading"
        :campaign-id="campaignId"
        :placed-entity-ids="placedEntityIds"
        @drag-start="onEntityDragStart"
        @focus-entity="onFocusEntity"
      />

      <!-- Canvas Area -->
      <div class="flex-1 relative min-w-0">
        <LoadingSkeleton v-if="loading" class="absolute inset-0" />

        <div v-else-if="error" class="flex items-center justify-center h-full text-destructive">
          {{ $t('diagrams.errors.loadFailed') }}
        </div>

        <TldrawCanvas
          v-else
          ref="canvasRef"
          :snapshot="snapshot"
          :read-only="readOnly"
          :campaign-id="campaignId"
          @save="onCanvasChange"
          @placed-entities-change="onPlacedEntitiesChange"
          @editor-ready="onEditorReady"
          @drop="onCanvasDrop"
        />

        <!-- Entity Popover -->
        <EntityPopover
          v-if="popoverVisible"
          :visible="popoverVisible"
          :entity-id="popoverEntityId"
          :campaign-id="campaignId"
          :slug="popoverSlug"
          :x="popoverX"
          :y="popoverY"
          @close="popoverVisible = false"
        />
      </div>
    </div>

    <!-- Map Modal -->
    <MapModal
      :open="mapModalOpen"
      :map-id="mapModalId"
      :campaign-id="campaignId"
      @close="mapModalOpen = false"
    />

    <!-- Relationship Dialog -->
    <RelationshipDialog
      :visible="relationshipDialogOpen"
      :campaign-id="campaignId"
      :source-entity-id="selectedEntityId"
      :source-entity-type="selectedEntityType"
      :source-entity-slug="selectedEntitySlug"
      :source-entity-name="selectedEntityName"
      @close="relationshipDialogOpen = false"
      @created="onRelationshipCreated"
    />
  </div>
</template>

<script setup lang="ts">
import TldrawCanvas from '~/components/diagrams/TldrawCanvas.vue'
import EntityPanel from '~/components/diagrams/EntityPanel.vue'
import EntityPopover from '~/components/diagrams/EntityPopover.vue'
import MapModal from '~/components/diagrams/MapModal.vue'
import RelationshipDialog from '~/components/diagrams/RelationshipDialog.vue'
import { radialLayout } from '~/utils/diagram-layout'

definePageMeta({ layout: 'empty' })

const route = useRoute()
const campaignId = route.params.id as string
const diagramId = route.params.diagramId as string

const diagram = ref<{ title: string } | null>(null)
const snapshot = ref<Record<string, unknown> | undefined>(undefined)
const readOnly = ref(false)
const loading = ref(true)
const error = ref(false)
const saveStatus = ref<'idle' | 'saving' | 'saved'>('idle')
const placedEntityIds = ref(new Map<string, number>())
const canvasRef = ref<InstanceType<typeof TldrawCanvas> | null>(null)
const tldrFileInputRef = ref<HTMLInputElement | null>(null)

// Popover state
const popoverVisible = ref(false)
const popoverEntityId = ref('')
const popoverSlug = ref('')
const popoverX = ref(200)
const popoverY = ref(200)

// Map modal state
const mapModalOpen = ref(false)
const mapModalId = ref('')

// Selected entity state (for relationship dialog)
const selectedEntityId = ref('')
const selectedEntityType = ref('')
const selectedEntitySlug = ref('')
const selectedEntityName = ref('')
const relationshipDialogOpen = ref(false)

// Type filter
const filterType = ref<string>('all')
const { t } = useI18n()
const filterOptions = computed(() => [
  { value: 'all', label: t('diagrams.filter.all') },
  { value: 'character', label: t('diagrams.filter.characters') },
  { value: 'location', label: t('diagrams.filter.locations') },
  { value: 'organization', label: t('diagrams.filter.organizations') },
  { value: 'quest', label: t('diagrams.filter.quests') },
  { value: 'wiki', label: t('diagrams.filter.wiki') },
])

let editorInstance: unknown = null
let pendingEntityDrop: { entityData: string; event: DragEvent } | null = null
let saveTimer: ReturnType<typeof setTimeout> | null = null
let lastSnapshot: Record<string, unknown> | null = null

async function load() {
  loading.value = true
  error.value = false
  try {
    const [campaignData, diagramData] = await Promise.all([
      $fetch<{ role?: string }>(`/api/campaigns/${campaignId}`),
      $fetch<{ title: string }>(`/api/campaigns/${campaignId}/diagrams/${diagramId}`),
    ])

    const role = (campaignData as { role?: string })?.role ?? ''
    readOnly.value = !['dm', 'co_dm', 'editor'].includes(role)
    diagram.value = diagramData

    try {
      const snapshotData = await $fetch<{ snapshot: Record<string, unknown> }>(
        `/api/campaigns/${campaignId}/diagrams/${diagramId}/snapshot`,
      )
      snapshot.value = snapshotData.snapshot
    } catch (e: unknown) {
      if ((e as { statusCode?: number })?.statusCode !== 404) throw e
      // No snapshot yet — start with empty canvas
      snapshot.value = undefined
    }
  } catch {
    error.value = true
  } finally {
    loading.value = false
  }
}

function onCanvasChange(newSnapshot: Record<string, unknown>) {
  lastSnapshot = newSnapshot
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => autoSave(newSnapshot), 1000)
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

async function saveNow() {
  if (!lastSnapshot) return
  if (saveTimer) {
    clearTimeout(saveTimer)
    saveTimer = null
  }
  await autoSave(lastSnapshot)
}

let selectionDebounce: ReturnType<typeof setTimeout> | null = null

function onEditorReady(editor: unknown) {
  editorInstance = editor
  if (pendingEntityDrop) {
    handleEntityDrop(pendingEntityDrop.entityData, pendingEntityDrop.event)
    pendingEntityDrop = null
  }

  // Track selection changes for the "Add Relationship" button
  const ENTITY_SHAPE_TYPES = ['npcToken', 'entityCard', 'locationPin', 'questNode', 'factionCard']
  const ed = editor as {
    store: { listen: (fn: () => void, opts: Record<string, unknown>) => void }
    getSelectedShapes: () => { id: string; type: string; props?: Record<string, unknown> }[]
  }
  ed.store.listen(
    () => {
      if (selectionDebounce) clearTimeout(selectionDebounce)
      selectionDebounce = setTimeout(() => {
        const selected = ed.getSelectedShapes()
        if (
          selected.length === 1 &&
          ENTITY_SHAPE_TYPES.includes(selected[0]!.type) &&
          selected[0]!.props?.entityId
        ) {
          const shape = selected[0]!
          selectedEntityId.value = shape.props!.entityId as string
          selectedEntityType.value =
            shape.type === 'npcToken'
              ? 'character'
              : shape.type === 'factionCard'
                ? 'organization'
                : shape.type === 'locationPin'
                  ? 'location'
                  : ((shape.props!.type as string) ?? 'entity')
          selectedEntitySlug.value = (shape.props!.slug as string) ?? ''
          selectedEntityName.value =
            (shape.props!.characterName as string) ??
            (shape.props!.locationName as string) ??
            (shape.props!.factionName as string) ??
            ''
        } else {
          selectedEntityId.value = ''
          selectedEntityType.value = ''
          selectedEntitySlug.value = ''
          selectedEntityName.value = ''
        }
      }, 50)
    },
    { scope: 'document', source: 'user' },
  )
}

function onPlacedEntitiesChange(counts: Map<string, number>) {
  placedEntityIds.value = counts
}

function onEntityDragStart(_entityData: string) {}

function onRelationshipCreated() {
  relationshipDialogOpen.value = false
  syncRelations()
}

function onFocusEntity(entityId: string) {
  canvasRef.value?.focusEntity(entityId)
}

async function expandRelatedEntities() {
  const ed = editorInstance as {
    getCurrentPageShapes: () => { id: string; type: string; props?: Record<string, unknown> }[]
    createShape: (shape: Record<string, unknown>) => unknown
    getShape: (id: string) => { x: number; y: number } | undefined
  } | null
  if (!ed || !selectedEntityId.value) return

  // Find the selected shape to get its position
  let centerX = 400
  let centerY = 400
  for (const shape of ed.getCurrentPageShapes()) {
    if (shape.props?.entityId === selectedEntityId.value) {
      const full = ed.getShape(shape.id)
      if (full) {
        centerX = full.x
        centerY = full.y
      }
      break
    }
  }

  // Fetch graph data
  let graphData: {
    nodes: Record<string, { name: string; type: string; slug: string; image?: string | null }>
    edges: Record<string, { source: string; target: string }>
  }
  try {
    graphData = await $fetch(`/api/campaigns/${campaignId}/graph`)
  } catch {
    return
  }

  // Collect entity IDs already on canvas
  const onCanvas = new Set<string>()
  for (const shape of ed.getCurrentPageShapes()) {
    if (shape.props?.entityId) onCanvas.add(shape.props.entityId as string)
  }

  // Find related entity IDs based on type
  const relatedIds: string[] = []
  const entityId = selectedEntityId.value
  const entityType = selectedEntityType.value

  for (const [key, edge] of Object.entries(graphData.edges)) {
    if (entityType === 'organization') {
      // org-member: org is source → target is character entity
      // org-location: org is source → target is location entity
      if (
        (key.startsWith('org-member:') || key.startsWith('org-location:')) &&
        edge.source === entityId
      ) {
        if (!onCanvas.has(edge.target)) relatedIds.push(edge.target)
      }
    } else if (entityType === 'location') {
      // char-location: character is source → location is target
      if (key.startsWith('char-location:') && edge.target === entityId) {
        if (!onCanvas.has(edge.source)) relatedIds.push(edge.source)
      }
      // org-location: org is source → location is target
      if (key.startsWith('org-location:') && edge.target === entityId) {
        if (!onCanvas.has(edge.source)) relatedIds.push(edge.source)
      }
    }
  }

  if (relatedIds.length === 0) {
    syncRelations()
    return
  }

  // Compute positions
  const positions = radialLayout(centerX, centerY, relatedIds.length, 250)

  // Create shapes
  for (let i = 0; i < relatedIds.length; i++) {
    const id = relatedIds[i]!
    const node = graphData.nodes[id]
    if (!node) continue
    const pos = positions[i]!

    const nodeType = node.type
    if (nodeType === 'character') {
      ed.createShape({
        type: 'npcToken',
        x: pos.x - 70,
        y: pos.y - 80,
        props: {
          w: 140,
          h: 160,
          entityId: id,
          campaignId,
          slug: node.slug,
          characterName: node.name,
          portraitUrl: node.image ?? undefined,
        },
      })
    } else if (nodeType === 'location') {
      ed.createShape({
        type: 'locationPin',
        x: pos.x - 90,
        y: pos.y - 30,
        props: {
          w: 180,
          h: 60,
          entityId: id,
          campaignId,
          slug: node.slug,
          locationName: node.name,
        },
      })
    } else if (nodeType === 'organization') {
      ed.createShape({
        type: 'factionCard',
        x: pos.x - 90,
        y: pos.y - 50,
        props: {
          w: 180,
          h: 100,
          entityId: id,
          campaignId,
          slug: node.slug,
          factionName: node.name,
        },
      })
    }
  }

  syncRelations()
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

  let entity: Record<string, unknown>
  try {
    entity = JSON.parse(entityDataStr) as Record<string, unknown>
  } catch {
    return
  }

  const editorAny = editorInstance as {
    screenToPage: (p: { x: number; y: number }) => { x: number; y: number }
    createShape: (shape: Record<string, unknown>) => void
  }
  const pagePoint = editorAny.screenToPage({ x: event.clientX, y: event.clientY })

  const shapeMap: Record<string, string> = {
    character: 'npcToken',
    location: 'locationPin',
    quest: 'questNode',
    organization: 'factionCard',
  }

  const shapeType = shapeMap[entity.entityType ?? entity.type] ?? 'entityCard'

  const shapeProps: Record<string, unknown> = {
    entityId: entity.id,
    campaignId,
    slug: entity.slug ?? '',
  }

  if (shapeType === 'npcToken') {
    shapeProps.characterName = entity.name
    shapeProps.portraitUrl = entity.portraitUrl ?? undefined
  } else if (shapeType === 'locationPin') {
    shapeProps.locationName = entity.name
  } else if (shapeType === 'questNode') {
    shapeProps.questTitle = entity.name
    shapeProps.status = entity.status ?? 'planned'
  } else if (shapeType === 'factionCard') {
    shapeProps.factionName = entity.name
  } else {
    shapeProps.entityName = entity.name
    shapeProps.entityType = entity.entityType ?? entity.type
    shapeProps.portraitUrl = entity.portraitUrl ?? undefined
  }

  editorAny.createShape({
    type: shapeType,
    x: pagePoint.x - 100,
    y: pagePoint.y - 40,
    props: shapeProps,
  })

  // After drop, auto-sync relations after 1s so new shape is committed to the store
  setTimeout(() => syncRelations(), 1000)
}

// Map graph relationTypeSlug to tldraw named colors
function relationTypeToColor(relationTypeSlug?: string, attitude?: number): string {
  if (
    relationTypeSlug === 'rival' ||
    relationTypeSlug === 'enemy' ||
    (attitude !== undefined && attitude < 0)
  )
    return 'red'
  if (relationTypeSlug === 'family') return 'violet'
  if (relationTypeSlug === 'member') return 'violet'
  if (relationTypeSlug === 'mentor') return 'blue'
  if (relationTypeSlug === 'location') return 'orange'
  if (relationTypeSlug === 'ally' || (attitude !== undefined && attitude >= 70)) return 'green'
  return 'grey'
}

// Fetch graph edges and draw tldraw arrows for entity pairs present on canvas
async function syncRelations() {
  const ed = editorInstance as {
    getCurrentPageShapes: () => { id: string; type: string; props?: Record<string, unknown> }[]
    createShape: (shape: Record<string, unknown>) => unknown
    createBinding: (binding: Record<string, unknown>) => void
    getBindingsFromShape: (
      shapeId: string,
      type: string,
    ) => { toId: string; props: { terminal: string } }[]
  } | null
  if (!ed) return

  // Collect entityId → shapeId map for all entity-linked shapes on canvas
  const ENTITY_TYPES = ['npcToken', 'entityCard', 'locationPin', 'questNode', 'factionCard']
  const entityToShape = new Map<string, string>()
  for (const shape of ed.getCurrentPageShapes()) {
    if (ENTITY_TYPES.includes(shape.type) && shape.props?.entityId) {
      const eid = shape.props.entityId as string
      if (!entityToShape.has(eid)) entityToShape.set(eid, shape.id)
    }
  }
  if (entityToShape.size < 2) return

  // Fetch all relations for the campaign from the graph API
  let graphData: {
    edges: Record<
      string,
      {
        source: string
        target: string
        label?: string
        relationTypeSlug?: string
        attitude?: number
      }
    >
  }
  try {
    graphData = await $fetch(`/api/campaigns/${campaignId}/graph`)
  } catch {
    return
  }

  // Build a set of existing bound arrow pairs (fromShapeId→toShapeId) to avoid duplicates.
  // In tldraw v4, arrow-to-shape connections use the Bindings API: each arrow shape has
  // separate TLArrowBinding records with terminal='start'|'end' and toId pointing to the target.
  const existingArrows = new Set<string>()
  for (const shape of ed.getCurrentPageShapes()) {
    if (shape.type !== 'arrow') continue
    const bindings = ed.getBindingsFromShape(shape.id, 'arrow')
    const startBinding = bindings.find((b) => b.props.terminal === 'start')
    const endBinding = bindings.find((b) => b.props.terminal === 'end')
    if (startBinding && endBinding) {
      existingArrows.add(`${startBinding.toId}→${endBinding.toId}`)
    }
  }

  // Create arrows for relations between shapes on canvas
  let arrowsCreated = 0
  for (const edge of Object.values(graphData.edges)) {
    const fromShapeId = entityToShape.get(edge.source)
    const toShapeId = entityToShape.get(edge.target)
    if (!fromShapeId || !toShapeId) continue
    if (existingArrows.has(`${fromShapeId}→${toShapeId}`)) continue

    const color = relationTypeToColor(edge.relationTypeSlug, edge.attitude)
    // tldraw v4: createShape returns `this` (editor), not the shape.
    // Pre-generate the ID so we can reference it in createBinding calls.
    // Shape IDs follow the format "shape:<uuid>" per the tldraw schema.
    const arrowId = `shape:${crypto.randomUUID()}` as `shape:${string}`
    try {
      ed.createShape({
        id: arrowId,
        type: 'arrow',
        props: {
          start: { x: 0, y: 0 },
          end: { x: 100, y: 0 },
          richText: {
            type: 'doc',
            content: edge.label
              ? [{ type: 'paragraph', content: [{ type: 'text', text: edge.label }] }]
              : [],
          },
          color,
          size: 's',
        },
      })
      ed.createBinding({
        type: 'arrow',
        fromId: arrowId,
        toId: fromShapeId,
        props: {
          terminal: 'start',
          normalizedAnchor: { x: 0.5, y: 0.5 },
          isExact: false,
          isPrecise: false,
        },
      })
      ed.createBinding({
        type: 'arrow',
        fromId: arrowId,
        toId: toShapeId,
        props: {
          terminal: 'end',
          normalizedAnchor: { x: 0.5, y: 0.5 },
          isExact: false,
          isPrecise: false,
        },
      })
      arrowsCreated++
    } catch (err) {
      console.error('[syncRelations] failed to create arrow:', err, {
        arrowId,
        fromShapeId,
        toShapeId,
        edge,
      })
    }
  }
  console.log(`[syncRelations] created ${arrowsCreated} arrows`)
}

// Type filter
function setFilter(type: string) {
  filterType.value = type
  canvasRef.value?.filterShapes(type)
}

// Reflow shapes
async function reflowShapes() {
  const ed = editorInstance as {
    getCurrentPageShapes: () => { id: string; type: string; props?: { entityId?: string } }[]
  } | null
  if (!ed) return
  const entityIds = [
    ...new Set(
      ed
        .getCurrentPageShapes()
        .filter((s) => s.props?.entityId)
        .map((s) => s.props!.entityId!),
    ),
  ]
  if (entityIds.length === 0) return
  try {
    const result = await $fetch<{ positions: Record<string, { x: number; y: number }> }>(
      `/api/campaigns/${campaignId}/diagrams/reflow`,
      {
        method: 'POST',
        body: { entityIds, diagramType: 'entity-graph' },
      },
    )
    const shapeUpdates = ed
      .getCurrentPageShapes()
      .filter((s) => s.props?.entityId && result.positions[s.props.entityId])
      .map((s) => ({
        id: s.id,
        x: result.positions[s.props!.entityId!]!.x,
        y: result.positions[s.props!.entityId!]!.y,
      }))
    ;(editorInstance as { updateShapes: (s: object[]) => void }).updateShapes(shapeUpdates)
  } catch (e) {
    console.error('[reflow] failed:', e)
  }
}

// aleph:entity-preview listener
function onAlephEntityPreview(e: Event) {
  if (readOnly.value) {
    // In read-only mode, fall back to opening in new tab
    const detail = (e as CustomEvent).detail as {
      campaignId: string
      slug: string
    }
    window.open(`/campaigns/${detail.campaignId}/entities/${detail.slug}`, '_blank')
    return
  }
  const detail = (e as CustomEvent).detail as {
    entityId: string
    campaignId: string
    slug: string
    x: number
    y: number
  }
  popoverEntityId.value = detail.entityId
  popoverSlug.value = detail.slug
  // Clamp popover within viewport
  popoverX.value = Math.min(detail.x, window.innerWidth - 300)
  popoverY.value = Math.min(detail.y, window.innerHeight - 400)
  popoverVisible.value = true
}

// aleph:navigate listener (Task 7.4)
function onAlephNavigate(e: Event) {
  const detail = (e as CustomEvent).detail as {
    targetType: string
    targetDiagramId?: string
    targetUrl?: string
  }
  if (detail.targetType === 'diagram' && detail.targetDiagramId) {
    useRouter().push(`/campaigns/${campaignId}/diagrams/${detail.targetDiagramId}`)
  } else if (detail.targetType === 'external' && detail.targetUrl) {
    window.open(detail.targetUrl, '_blank')
  }
}

// aleph:open-map listener (Task 8.3)
function onAlephOpenMap(e: Event) {
  const detail = (e as CustomEvent).detail as { mapId: string; campaignId: string }
  mapModalId.value = detail.mapId
  mapModalOpen.value = true
}

function onDocMouseDown(e: MouseEvent) {
  if (!popoverVisible.value) return
  const popoverEl = document.querySelector('[data-testid="entity-popover"]')
  if (popoverEl && !popoverEl.contains(e.target as Node)) {
    popoverVisible.value = false
  }
}

onMounted(() => {
  load()
  window.addEventListener('aleph:entity-preview', onAlephEntityPreview)
  window.addEventListener('aleph:navigate', onAlephNavigate)
  window.addEventListener('aleph:open-map', onAlephOpenMap)
  document.addEventListener('mousedown', onDocMouseDown, { capture: true })
})

onUnmounted(() => {
  window.removeEventListener('aleph:entity-preview', onAlephEntityPreview)
  window.removeEventListener('aleph:navigate', onAlephNavigate)
  window.removeEventListener('aleph:open-map', onAlephOpenMap)
  document.removeEventListener('mousedown', onDocMouseDown, { capture: true })
})

interface TldrAsset {
  id: string
  typeName: 'asset'
  type: string
  props?: { src?: string; mimeType?: string; name?: string }
}

interface TldrFile {
  tldrawFileFormatVersion: number
  schema: unknown
  records: Array<TldrAsset | Record<string, unknown>>
}

async function uploadAssets(parsed: TldrFile): Promise<TldrFile> {
  const assetRecords = parsed.records.filter(
    (r): r is TldrAsset => r.typeName === 'asset' && typeof r.props?.src === 'string',
  )

  if (assetRecords.length === 0) return parsed

  // Build assetId → server URL map
  const urlMap = new Map<string, string>()

  await Promise.all(
    assetRecords.map(async (asset) => {
      const src = asset.props!.src!
      if (!src.startsWith('data:')) return // already a URL, skip

      const mimeType = asset.props?.mimeType ?? src.split(';')[0]?.slice(5) ?? 'image/png'
      const mimeToExt: Record<string, string> = {
        'image/png': '.png',
        'image/jpeg': '.jpg',
        'image/webp': '.webp',
        'image/gif': '.gif',
      }
      const ext = mimeToExt[mimeType] ?? '.png'
      const filename = (asset.props?.name ?? asset.id) + ext

      // Decode base64 → Blob
      const base64 = src.split(',')[1] ?? ''
      const binary = atob(base64)
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
      const blob = new Blob([bytes], { type: mimeType })

      const form = new FormData()
      form.append('file', blob, filename)

      try {
        const result = await $fetch<{ url: string }>(`/api/campaigns/${campaignId}/images`, {
          method: 'POST',
          body: form,
        })
        urlMap.set(asset.id, result.url)
      } catch (e) {
        console.warn(`[import] Failed to upload asset ${asset.id}:`, e)
      }
    }),
  )

  if (urlMap.size === 0) return parsed

  // Rewrite asset src fields with server URLs
  const rewrittenRecords = parsed.records.map((r) => {
    if (r.typeName !== 'asset') return r
    const asset = r as TldrAsset
    const newUrl = urlMap.get(asset.id)
    if (!newUrl) return r
    return { ...asset, props: { ...asset.props, src: newUrl } }
  })

  return { ...parsed, records: rewrittenRecords }
}

function onTldrFileSelected(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = async () => {
    let json = reader.result as string
    // Reset input so the same file can be re-selected
    if (tldrFileInputRef.value) tldrFileInputRef.value.value = ''

    // Upload embedded base64 images to server and rewrite asset URLs
    try {
      const parsed = JSON.parse(json) as TldrFile
      const rewritten = await uploadAssets(parsed)
      json = JSON.stringify(rewritten)
    } catch (e) {
      console.warn('[import] Asset upload step failed, importing as-is:', e)
    }

    canvasRef.value?.importTldrJson(json)
  }
  reader.readAsText(file)
}
</script>
