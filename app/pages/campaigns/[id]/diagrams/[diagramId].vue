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
            size="sm"
            :variant="filterType === f.value ? 'default' : 'outline'"
            @click="setFilter(f.value)"
          >
            {{ f.label }}
          </Button>
        </div>

        <!-- Multiplayer presence -->
        <DiagramPresenceBar v-if="multiplayerActive" :users="presenceUsers" />
        <DiagramConnectionStatus v-if="multiplayerEnabled" :status="syncStatus" />

        <div v-if="!readOnly" class="flex flex-wrap items-center gap-2">
          <span
            v-if="!multiplayerActive && saveStatus === 'saving'"
            class="text-xs text-muted-foreground"
          >
            {{ $t('diagrams.saving') }}
          </span>
          <span
            v-else-if="!multiplayerActive && saveStatus === 'saved'"
            class="text-xs text-green-600"
          >
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

          <!-- Expand related entities button (org/location/character) -->
          <Button
            v-if="
              selectedEntityType === 'organization' ||
              selectedEntityType === 'location' ||
              selectedEntityType === 'character'
            "
            size="sm"
            variant="outline"
            data-testid="expand-entity-btn"
            @click="onExpandClick"
          >
            {{ $t('diagrams.expand') }}
          </Button>

          <!-- Sync Relations button -->
          <Button
            size="sm"
            variant="outline"
            :disabled="syncingRelations"
            data-testid="sync-relations-btn"
            @click="handleSyncRelations"
          >
            {{
              syncingRelations ? $t('common.loading') : syncMessage || $t('diagrams.syncRelations')
            }}
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
          :snapshot="multiplayerEnabled ? undefined : snapshot"
          :read-only="readOnly"
          :campaign-id="campaignId"
          :dark-mode="isDarkMode"
          :sync-uri="syncUri"
          :user-info="userInfo"
          @save="onCanvasChange"
          @placed-entities-change="onPlacedEntitiesChange"
          @editor-ready="onEditorReady"
          @drop="onCanvasDrop"
          @sync-status-change="onSyncStatusChange"
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
          @expand="onPopoverExpand"
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
import DiagramPresenceBar from '~/components/diagrams/DiagramPresenceBar.vue'
import DiagramConnectionStatus from '~/components/diagrams/DiagramConnectionStatus.vue'
import { useEditorSelection } from '~/composables/useEditorSelection'
import { useArrowDimming } from '~/composables/useArrowDimming'
import { useSyncRelations } from '~/composables/useSyncRelations'
import { useEntityExpansion } from '~/composables/useEntityExpansion'
import { buildShapeCreateArgs } from '~/utils/diagram-shapes'
import { convertToWebP } from '~/utils/convert-to-webp'

definePageMeta({ layout: 'empty' })

const route = useRoute()
const campaignId = route.params.id as string
const diagramId = route.params.diagramId as string

// Detect dark mode from campaign theme (all named themes are dark)
const campaignTheme = useState<string | null>('campaignTheme', () => null)
const isDarkMode = computed(() => !!campaignTheme.value)

const diagram = ref<{ title: string } | null>(null)
const snapshot = ref<Record<string, unknown> | undefined>(undefined)
const readOnly = ref(false)
const loading = ref(true)
const error = ref(false)
const saveStatus = ref<'idle' | 'saving' | 'saved'>('idle')
const placedEntityIds = ref(new Map<string, number>())
const canvasRef = ref<InstanceType<typeof TldrawCanvas> | null>(null)
const tldrFileInputRef = ref<HTMLInputElement | null>(null)

// Multiplayer sync
const runtimeConfig = useRuntimeConfig()
const multiplayerEnabled = computed(() => !!runtimeConfig.public.diagramMultiplayer)
const multiplayerActive = ref(false)
const syncStatus = ref<string>('loading')

const syncUri = computed(() => {
  if (!multiplayerEnabled.value) return undefined
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${proto}//${window.location.host}/api/tldraw-sync/${diagramId}`
})

// User info for presence (deterministic color from user ID hash)
const { data: sessionData } = useAsyncData('session', () => $fetch('/api/auth/get-session'))
const userInfo = computed(() => {
  const session = sessionData.value as { user?: { id: string; name: string } } | null
  if (!session?.user) return undefined
  const hash = session.user.id.split('').reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0)
  const hue = Math.abs(hash) % 360
  return {
    id: session.user.id,
    name: session.user.name,
    color: `hsl(${hue}, 70%, 50%)`,
  }
})

const presenceUsers = ref<Array<{ id: string; name: string; color: string }>>([])
let presenceInterval: ReturnType<typeof setInterval> | null = null

function onSyncStatusChange(status: string) {
  syncStatus.value = status
  if (status === 'synced-remote') {
    multiplayerActive.value = true
    // Start polling presence
    if (!presenceInterval) {
      presenceInterval = setInterval(fetchPresence, 5000)
      fetchPresence()
    }
  } else if (status === 'error') {
    // Fallback to REST mode
    multiplayerActive.value = false
    if (presenceInterval) {
      clearInterval(presenceInterval)
      presenceInterval = null
    }
    presenceUsers.value = []
  }
}

async function fetchPresence() {
  try {
    const data = await $fetch<{ count: number }>(
      `/api/campaigns/${campaignId}/diagrams/${diagramId}/presence`,
    )
    // We only get count from server; the current user is always present
    const ui = userInfo.value
    if (ui && data.count > 0) {
      // Show current user as the known presence; others are anonymous for now
      presenceUsers.value = [ui]
      if (data.count > 1) {
        for (let i = 1; i < data.count; i++) {
          presenceUsers.value.push({
            id: `other-${i}`,
            name: `User ${i + 1}`,
            color: `hsl(${(i * 137) % 360}, 70%, 50%)`,
          })
        }
      }
    }
  } catch {
    /* ignore polling errors */
  }
}

// Popover state
const popoverVisible = ref(false)
const popoverEntityId = ref('')
const popoverSlug = ref('')
const popoverX = ref(200)
const popoverY = ref(200)
let lastPointerX = 200
let lastPointerY = 200

// Map modal state
const mapModalOpen = ref(false)
const mapModalId = ref('')

// Relationship dialog
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

// Editor instance + composable refs (initialized on editor ready)
let editorInstance: unknown = null
let pendingEntityDrop: { entityData: string; event: DragEvent } | null = null
let saveTimer: ReturnType<typeof setTimeout> | null = null
let lastSnapshot: Record<string, unknown> | null = null

// Composable refs — populated in onEditorReady
const selectedEntityId = ref('')
const selectedEntityType = ref('')
const selectedEntitySlug = ref('')
const selectedEntityName = ref('')
const syncingRelations = ref(false)
const syncMessage = ref('')

// i18n edge label translator
function translateEdgeLabel(label: string | undefined | null): string {
  if (!label) return ''
  const key = `diagrams.edgeLabels.${label}`
  const translated = t(key)
  return translated === key ? label : translated
}

// Composable functions — assigned in onEditorReady
let syncRelations: () => Promise<number> = async () => 0
let expandRelatedEntities: (entityId: string, entityType: string) => Promise<void> = async () => {}

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
      snapshot.value = undefined
    }
  } catch {
    error.value = true
  } finally {
    loading.value = false
  }
}

function onCanvasChange(newSnapshot: Record<string, unknown>) {
  if (multiplayerActive.value) return // server handles persistence in sync mode
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

function onEditorReady(editor: unknown) {
  editorInstance = editor
  if (pendingEntityDrop) {
    handleEntityDrop(pendingEntityDrop.entityData, pendingEntityDrop.event)
    pendingEntityDrop = null
  }

  // Wire composables to the editor
  const ed = editor as Parameters<typeof useEditorSelection>[0] &
    Parameters<typeof useArrowDimming>[0]

  const selection = useEditorSelection(ed)
  // Bind composable refs to page-level refs for template access
  watch(selection.selectedEntityId, (v) => (selectedEntityId.value = v))
  watch(selection.selectedEntityType, (v) => (selectedEntityType.value = v))
  watch(selection.selectedEntitySlug, (v) => (selectedEntitySlug.value = v))
  watch(selection.selectedEntityName, (v) => (selectedEntityName.value = v))

  useArrowDimming(ed, selection.selectedShapeId)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getEd = () => editorInstance as any
  const syncComposable = useSyncRelations(getEd, campaignId, translateEdgeLabel)
  syncRelations = syncComposable.syncRelations
  watch(syncComposable.syncing, (v) => (syncingRelations.value = v))

  const expandComposable = useEntityExpansion(getEd, campaignId, () => syncRelations())
  expandRelatedEntities = expandComposable.expandRelatedEntities
}

function onPlacedEntitiesChange(counts: Map<string, number>) {
  placedEntityIds.value = counts
}

function onEntityDragStart(_entityData: string) {}

async function handleSyncRelations() {
  syncMessage.value = ''
  const count = await syncRelations()
  syncMessage.value = count > 0 ? `+${count}` : '✓'
  setTimeout(() => (syncMessage.value = ''), 3000)
}

function onRelationshipCreated() {
  relationshipDialogOpen.value = false
  syncRelations()
}

function onFocusEntity(entityId: string) {
  canvasRef.value?.focusEntity(entityId)
}

function onExpandClick() {
  expandRelatedEntities(selectedEntityId.value, selectedEntityType.value)
}

function onPopoverExpand(entityId: string, entityType: string) {
  popoverVisible.value = false
  expandRelatedEntities(entityId, entityType)
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

  const entityType = (entity.entityType ?? entity.type) as string
  const { type: shapeType, props: shapeProps } = buildShapeCreateArgs(
    entityType,
    entity as {
      id: string
      name: string
      slug: string
      portraitUrl?: string | null
      status?: string | null
    },
    campaignId,
  )

  editorAny.createShape({
    type: shapeType,
    x: pagePoint.x - 100,
    y: pagePoint.y - 40,
    props: shapeProps,
  })

  // After drop, auto-sync relations after 1s so new shape is committed to the store
  setTimeout(() => syncRelations(), 1000)
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

function onDocPointerMove(e: PointerEvent) {
  lastPointerX = e.clientX
  lastPointerY = e.clientY
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
  }
  popoverEntityId.value = detail.entityId
  popoverSlug.value = detail.slug
  // Position near the double-click point, clamped within viewport
  popoverX.value = Math.min(lastPointerX + 16, window.innerWidth - 300)
  popoverY.value = Math.min(lastPointerY + 16, window.innerHeight - 420)
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
  document.addEventListener('pointermove', onDocPointerMove, { passive: true })
})

onUnmounted(() => {
  window.removeEventListener('aleph:entity-preview', onAlephEntityPreview)
  window.removeEventListener('aleph:navigate', onAlephNavigate)
  window.removeEventListener('aleph:open-map', onAlephOpenMap)
  document.removeEventListener('mousedown', onDocMouseDown, { capture: true })
  document.removeEventListener('pointermove', onDocPointerMove)
  if (presenceInterval) {
    clearInterval(presenceInterval)
    presenceInterval = null
  }
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

      // Decode base64 → Blob, then convert to WebP
      const base64 = src.split(',')[1] ?? ''
      const binary = atob(base64)
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
      const blob = new Blob([bytes], { type: mimeType })
      const converted = await convertToWebP(blob)
      const isConverted = converted !== blob
      const uploadExt = isConverted ? '.webp' : ext
      const uploadFilename = (asset.props?.name ?? asset.id) + uploadExt

      const form = new FormData()
      form.append('file', converted, uploadFilename)

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
