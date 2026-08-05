<template>
  <div class="p-8 max-w-3xl">
    <div v-if="loading" class="text-muted-foreground">{{ $t('common.loading') }}</div>
    <template v-else-if="arc">
      <!-- Breadcrumb -->
      <div class="flex items-center gap-2 text-sm text-muted-foreground mb-4">
        <NuxtLink :to="`/campaigns/${campaignId}`" class="hover:text-primary">{{
          $t('common.campaign')
        }}</NuxtLink>
        <span>/</span>
        <NuxtLink :to="`/campaigns/${campaignId}/arcs`" class="hover:text-primary">{{
          $t('arcs.title')
        }}</NuxtLink>
        <span>/</span>
        <span>{{ arc.name }}</span>
      </div>

      <!-- Header -->
      <div class="flex items-start justify-between gap-4 mb-6 flex-wrap gap-y-2">
        <div>
          <h1 class="text-2xl font-bold">{{ arc.name }}</h1>
          <span
            :class="['inline-flex text-xs px-2 py-0.5 rounded mt-1', arcStatusClass(arc.status)]"
            >{{ arcStatusLabel(arc.status) }}</span
          >
        </div>
        <div v-if="canEdit" class="flex gap-2 shrink-0">
          <Button variant="outline" size="sm" @click="startEditArc">{{ $t('common.edit') }}</Button>
          <Button variant="destructive" size="sm" @click="confirmDeleteArc">{{
            $t('common.delete')
          }}</Button>
        </div>
      </div>

      <!-- Edit arc inline -->
      <div v-if="editingArc" class="mb-6 p-4 rounded-lg border border-border space-y-3">
        <div>
          <label class="text-sm font-medium">{{ $t('arcs.name') }}</label>
          <input
            v-model="editArcForm.name"
            type="text"
            class="w-full mt-1 px-3 py-1.5 rounded border border-input bg-background text-sm"
          />
        </div>
        <div>
          <label class="text-sm font-medium">{{ $t('arcs.description') }}</label>
          <MarkdownEditor v-model="editArcForm.description" class="mt-1" />
        </div>
        <div>
          <label class="text-sm font-medium">{{ $t('arcs.status') }}</label>
          <select
            v-model="editArcForm.status"
            class="w-full mt-1 px-3 py-1.5 rounded border border-input bg-background text-sm"
          >
            <option value="planned">{{ $t('arcs.statusPlanned') }}</option>
            <option value="active">{{ $t('arcs.statusActive') }}</option>
            <option value="completed">{{ $t('arcs.statusCompleted') }}</option>
            <option value="paused">{{ $t('arcs.statusPaused') }}</option>
          </select>
        </div>
        <div class="flex gap-2">
          <Button size="sm" @click="saveArc">{{ $t('common.save') }}</Button>
          <Button size="sm" variant="outline" @click="editingArc = false">{{
            $t('common.cancel')
          }}</Button>
        </div>
      </div>

      <!-- Preview Role Switcher (DM only) -->
      <PreviewRoleSwitcher
        v-if="isDm"
        :campaign-role="campaignRole"
        :campaign-id="campaignId"
        :entity-slug="slug"
        class="mb-4"
      />

      <!-- Description -->
      <div
        v-if="arc.description && !editingArc"
        ref="contentRef"
        class="prose dark:prose-invert max-w-none text-foreground mb-6"
      >
        <MDC :value="arc.description" />
      </div>

      <!-- Secret Notes (DM only) -->
      <SecretNotes
        v-if="isDm"
        :campaign-id="campaignId"
        :entity-slug="slug"
        :campaign-role="campaignRole"
        class="mb-6"
      />

      <!-- Relations -->
      <EntityRelationsPanel
        v-if="arc.id"
        :campaign-id="campaignId"
        :entity-id="arc.id"
        entity-type="arc"
        :entity-slug="slug"
        :entity-name="arc.name"
        :role="campaignRole"
        class="mb-6"
      />

      <!-- Linked sessions -->
      <section v-if="linkedSessions.length" class="mb-6">
        <h2 class="text-lg font-semibold mb-3">{{ $t('arcs.sessions') }}</h2>
        <div class="space-y-2">
          <NuxtLink
            v-for="session in linkedSessions"
            :key="session.id"
            :to="`/campaigns/${campaignId}/sessions/${session.slug}`"
            class="flex items-center gap-2 p-2 rounded border border-border hover:bg-accent/30 text-sm"
          >
            <span class="font-medium">{{ session.title }}</span>
            <span v-if="session.scheduledDate" class="text-xs text-muted-foreground">{{
              new Date(session.scheduledDate).toLocaleDateString()
            }}</span>
          </NuxtLink>
        </div>
      </section>

      <!-- Chapters -->
      <section>
        <div class="flex items-center justify-between mb-3">
          <h2 class="text-lg font-semibold">{{ $t('arcs.chapters') }}</h2>
          <Button
            v-if="canEdit"
            size="sm"
            variant="outline"
            @click="showAddChapter = !showAddChapter"
          >
            {{ showAddChapter ? $t('common.cancel') : $t('arcs.addChapter') }}
          </Button>
        </div>

        <!-- Add chapter form -->
        <div
          v-if="showAddChapter"
          class="mb-4 p-3 rounded border border-dashed border-border space-y-2"
        >
          <input
            v-model="newChapterName"
            type="text"
            :placeholder="$t('arcs.chapterNamePlaceholder')"
            class="w-full px-3 py-1.5 rounded border border-input bg-background text-sm"
          />
          <MarkdownEditor
            v-model="newChapterDescription"
            :placeholder="$t('arcs.descriptionPlaceholder')"
          />
          <Button size="sm" :disabled="!newChapterName.trim()" @click="addChapter">{{
            $t('common.add')
          }}</Button>
        </div>

        <div v-if="arc.chapters?.length === 0" class="text-sm text-muted-foreground">
          {{ $t('arcs.noChapters') }}
        </div>
        <div v-else class="space-y-2">
          <div
            v-for="(chapter, index) in arc.chapters"
            :key="chapter.id"
            class="p-3 rounded border border-border"
          >
            <template v-if="editingChapterId === chapter.id">
              <!-- Inline edit mode -->
              <div class="space-y-2">
                <input
                  v-model="editChapterForm.name"
                  type="text"
                  class="w-full px-3 py-1.5 rounded border border-input bg-background text-sm"
                />
                <MarkdownEditor v-model="editChapterForm.description" />
                <div class="flex gap-2">
                  <Button size="sm" @click="saveChapter(chapter)">{{ $t('common.save') }}</Button>
                  <Button size="sm" variant="outline" @click="editingChapterId = null">{{
                    $t('common.cancel')
                  }}</Button>
                </div>
              </div>
            </template>
            <template v-else>
              <div class="flex items-start justify-between gap-2">
                <div class="flex-1 min-w-0">
                  <span class="font-medium text-sm">{{ chapter.name }}</span>
                  <div
                    v-if="chapter.description"
                    class="prose dark:prose-invert prose-sm max-w-none text-muted-foreground mt-0.5"
                  >
                    <MDC :value="chapter.description" />
                  </div>
                </div>
                <div v-if="canEdit" class="flex items-center gap-1 shrink-0">
                  <!-- Reorder buttons -->
                  <button
                    type="button"
                    :disabled="index === 0"
                    class="p-1 rounded hover:bg-accent disabled:opacity-30"
                    @click="moveChapter(chapter, -1)"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    :disabled="index === arc.chapters.length - 1"
                    class="p-1 rounded hover:bg-accent disabled:opacity-30"
                    @click="moveChapter(chapter, 1)"
                  >
                    ↓
                  </button>
                  <Button size="sm" variant="ghost" @click="startEditChapter(chapter)">{{
                    $t('common.edit')
                  }}</Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    class="text-destructive"
                    @click="confirmDeleteChapter(chapter)"
                    >{{ $t('common.delete') }}</Button
                  >
                </div>
              </div>
            </template>
          </div>
        </div>
      </section>
    </template>
    <div v-else class="text-muted-foreground">{{ $t('common.notFound') }}</div>

    <ErrorToast v-if="error" :message="error" @dismiss="dismissError" />
  </div>
</template>

<script setup lang="ts">
import type { GameSession } from '~/types/api'
import { sortSessionsByDate } from '~/utils/session-order'

interface Chapter {
  id: string
  slug: string
  name: string
  description: string | null
  sortOrder: number
}

interface Arc {
  id: string
  slug: string
  name: string
  description: string | null
  status: string
  chapters?: Chapter[]
}

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const campaignId = route.params.id as string
const slug = route.params.slug as string
const api = useCampaignApi(campaignId)
const { loading, error, withLoading, dismissError } = useLoadingState()

const arc = ref<Arc | null>(null)
const linkedSessions = ref<GameSession[]>([])
const canEdit = ref(false)
const campaignRole = ref<string>('')
const isDm = computed(() => ['dm', 'co_dm'].includes(campaignRole.value))
const contentRef = ref<HTMLElement>()

// Arc editing
const editingArc = ref(false)
const editArcForm = reactive({ name: '', description: '', status: '' })

// Chapter state
const showAddChapter = ref(false)
const newChapterName = ref('')
const newChapterDescription = ref('')
const editingChapterId = ref<string | null>(null)
const editChapterForm = reactive({ name: '', description: '' })

function arcStatusClass(status: string) {
  switch (status) {
    case 'active':
      return 'bg-blue-100 text-blue-700'
    case 'completed':
      return 'bg-green-100 text-green-700'
    case 'paused':
      return 'bg-yellow-100 text-yellow-700'
    default:
      return 'bg-secondary text-secondary-foreground'
  }
}

// Translate an arc status value (planned/active/completed/paused) to its localized
// label, falling back to the raw value for any unmapped status.
function arcStatusLabel(status?: string | null): string {
  if (!status) return ''
  const key = `arcs.status${status.charAt(0).toUpperCase()}${status.slice(1)}`
  return t(key, status)
}

async function load() {
  await withLoading(async () => {
    const previewAs = route.query.preview_as as string | undefined
    const arcParams = previewAs ? { preview_as: previewAs } : undefined
    // Sessions are asked for by arc on the server (arcSlug) with pagination switched
    // off (pageSize=0). Fetching a default page and filtering client-side used to drop
    // every session past the 50th — which, with sessions ordered by number descending,
    // hid the whole of the earliest arcs — and the paginated `{data, meta}` envelope is
    // not an array, so the filter threw and killed the rest of load().
    const [arcs, campaign, sessionsRes] = await Promise.all([
      api.getArcs(arcParams),
      api.getCampaign(),
      api.getSessions({ arcSlug: slug, pageSize: '0' }),
    ])
    const found = arcs.find((a: Arc) => a.slug === slug)
    if (!found) {
      await router.push(`/campaigns/${campaignId}/arcs`)
      return
    }
    arc.value = found
    campaignRole.value = (campaign as { role?: string }).role ?? ''
    canEdit.value = ['dm', 'co_dm'].includes(campaignRole.value)
    // pageSize=0 returns a bare array today; stay tolerant of the paginated envelope.
    const rows = Array.isArray(sessionsRes)
      ? sessionsRes
      : ((sessionsRes as unknown as { data?: GameSession[] }).data ?? [])
    // arcSlug is deliberately permissive server-side about a duplicated slug; this page
    // is showing one specific arc, so keep only that arc's sessions.
    // `sessionNumber` does not follow chronological order in aleph (it can be
    // reassigned independently of when a session was played), so order the list by
    // `scheduledDate` rather than trust whatever order the API returned.
    linkedSessions.value = sortSessionsByDate(rows.filter((s: GameSession) => s.arcId === found.id))
  })
}

function startEditArc() {
  editArcForm.name = arc.value.name
  editArcForm.description = arc.value.description ?? ''
  editArcForm.status = arc.value.status
  editingArc.value = true
}

async function saveArc() {
  await api.updateArc(slug, {
    name: editArcForm.name,
    description: editArcForm.description,
    status: editArcForm.status,
  })
  editingArc.value = false
  await load()
}

async function confirmDeleteArc() {
  if (!confirm(t('arcs.confirmDelete'))) return
  await api.deleteArc(slug)
  await router.push(`/campaigns/${campaignId}/arcs`)
}

async function addChapter() {
  if (!newChapterName.value.trim()) return
  const sortOrder = arc.value.chapters?.length ?? 0
  await api.createChapter({
    arcId: arc.value.id,
    name: newChapterName.value.trim(),
    description: newChapterDescription.value || null,
    sortOrder,
  })
  newChapterName.value = ''
  newChapterDescription.value = ''
  showAddChapter.value = false
  await load()
}

function startEditChapter(chapter: Chapter) {
  editChapterForm.name = chapter.name
  editChapterForm.description = chapter.description ?? ''
  editingChapterId.value = chapter.id
}

async function saveChapter(chapter: Chapter) {
  await api.updateChapter(chapter.slug, {
    name: editChapterForm.name,
    description: editChapterForm.description,
  })
  editingChapterId.value = null
  await load()
}

async function confirmDeleteChapter(chapter: Chapter) {
  if (!confirm(t('arcs.confirmDeleteChapter'))) return
  await api.deleteChapter(chapter.slug)
  await load()
}

async function moveChapter(chapter: Chapter, direction: number) {
  const chapters = arc.value?.chapters ?? []
  const idx = chapters.findIndex((c: Chapter) => c.id === chapter.id)
  const swapIdx = idx + direction
  if (swapIdx < 0 || swapIdx >= chapters.length) return

  // Swap sort orders
  const newOrder = chapter.sortOrder
  const swapOrder = chapters[swapIdx].sortOrder
  await Promise.all([
    api.updateChapter(chapter.slug, { sortOrder: swapOrder }),
    api.updateChapter(chapters[swapIdx].slug, { sortOrder: newOrder }),
  ])
  await load()
}

// Secret block reveal composable
const { loadRevealedBlocks, injectRevealButtons } = useSecretReveals(
  contentRef,
  campaignId,
  slug,
  isDm,
  t,
)

watch(
  () => route.query.preview_as,
  async () => {
    await load()
    await nextTick()
    injectRevealButtons()
  },
)

onMounted(async () => {
  await load()
  await loadRevealedBlocks()
  await nextTick()
  injectRevealButtons()
})
</script>
