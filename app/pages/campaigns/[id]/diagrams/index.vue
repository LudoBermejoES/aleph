<template>
  <div class="p-8">
    <div class="flex items-center gap-2 text-sm text-muted-foreground mb-1">
      <NuxtLink :to="`/campaigns/${campaignId}`" class="hover:text-primary">
        {{ $t('common.campaign') }}
      </NuxtLink>
      <span>/</span>
      <span>{{ $t('diagrams.title') }}</span>
    </div>

    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold">{{ $t('diagrams.title') }}</h1>
      <Button v-if="canEdit" data-testid="new-diagram-btn" @click="showCreateDialog = true">
        {{ $t('diagrams.create') }}
      </Button>
    </div>

    <LoadingSkeleton v-if="loading" :rows="4" />

    <div v-else-if="diagrams.length === 0" class="text-center text-muted-foreground py-16">
      {{ $t('diagrams.empty') }}
    </div>

    <div v-else class="grid gap-3">
      <div
        v-for="diagram in diagrams"
        :key="diagram.id"
        class="flex items-center justify-between p-4 rounded-lg border border-border hover:border-primary/50 transition-colors"
      >
        <NuxtLink :to="`/campaigns/${campaignId}/diagrams/${diagram.id}`" class="flex-1 min-w-0">
          <div class="font-medium">{{ diagram.title }}</div>
          <div class="text-sm text-muted-foreground capitalize">
            {{ diagram.diagramType || 'freeform' }}
          </div>
        </NuxtLink>
        <Button
          v-if="canDelete"
          variant="ghost"
          size="sm"
          class="text-destructive hover:text-destructive"
          data-testid="delete-diagram-btn"
          @click="confirmDelete(diagram)"
        >
          {{ $t('diagrams.delete') }}
        </Button>
      </div>
    </div>

    <!-- Create Dialog -->
    <Dialog v-model:open="showCreateDialog">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{{ $t('diagrams.create') }}</DialogTitle>
        </DialogHeader>
        <div class="space-y-4 py-2">
          <div>
            <label class="text-sm font-medium mb-1 block">{{ $t('common.title') }}</label>
            <Input v-model="newTitle" data-testid="diagram-title-input" autofocus />
          </div>
          <div>
            <label class="text-sm font-medium mb-1 block">{{ $t('diagrams.type') }}</label>
            <select
              v-model="newType"
              class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="freeform">{{ $t('diagrams.types.freeform') }}</option>
              <option value="entity-graph">{{ $t('diagrams.types.entityGraph') }}</option>
              <option value="quest-tree">{{ $t('diagrams.types.questTree') }}</option>
              <option value="faction-web">{{ $t('diagrams.types.factionWeb') }}</option>
              <option value="session-timeline">{{ $t('diagrams.types.sessionTimeline') }}</option>
            </select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" @click="showCreateDialog = false">{{
            $t('common.cancel')
          }}</Button>
          <Button :disabled="!newTitle.trim() || creating" @click="createDiagram">
            {{ $t('diagrams.create') }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Delete Confirmation Dialog -->
    <Dialog v-model:open="showDeleteDialog">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{{ $t('diagrams.delete') }}</DialogTitle>
          <DialogDescription>
            {{ $t('diagrams.confirmDelete', { title: deletingDiagram?.title }) }}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" @click="showDeleteDialog = false">{{
            $t('common.cancel')
          }}</Button>
          <Button
            variant="destructive"
            :disabled="deleting"
            data-testid="confirm-delete-btn"
            @click="deleteDiagram"
          >
            {{ $t('diagrams.delete') }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const router = useRouter()
const campaignId = route.params.id as string

const diagrams = ref<any[]>([])
const canEdit = ref(false)
const canDelete = ref(false)
const loading = ref(false)

const showCreateDialog = ref(false)
const newTitle = ref('')
const newType = ref('freeform')
const creating = ref(false)

const showDeleteDialog = ref(false)
const deletingDiagram = ref<any>(null)
const deleting = ref(false)

async function load() {
  loading.value = true
  try {
    const [campaignData, diagramsData] = await Promise.all([
      $fetch<any>(`/api/campaigns/${campaignId}`),
      $fetch<any[]>(`/api/campaigns/${campaignId}/diagrams`),
    ])
    const role = campaignData?.role ?? ''
    canEdit.value = ['dm', 'co_dm', 'editor'].includes(role)
    canDelete.value = ['dm', 'co_dm'].includes(role)
    diagrams.value = diagramsData
  } finally {
    loading.value = false
  }
}

async function createDiagram() {
  if (!newTitle.value.trim()) return
  creating.value = true
  try {
    const result = await $fetch<any>(`/api/campaigns/${campaignId}/diagrams`, {
      method: 'POST',
      body: { title: newTitle.value.trim(), diagramType: newType.value },
    })
    showCreateDialog.value = false
    newTitle.value = ''
    newType.value = 'freeform'
    router.push(`/campaigns/${campaignId}/diagrams/${result.id}`)
  } finally {
    creating.value = false
  }
}

function confirmDelete(diagram: any) {
  deletingDiagram.value = diagram
  showDeleteDialog.value = true
}

async function deleteDiagram() {
  if (!deletingDiagram.value) return
  deleting.value = true
  try {
    await $fetch(`/api/campaigns/${campaignId}/diagrams/${deletingDiagram.value.id}`, {
      method: 'DELETE',
    })
    diagrams.value = diagrams.value.filter((d) => d.id !== deletingDiagram.value.id)
    showDeleteDialog.value = false
    deletingDiagram.value = null
  } finally {
    deleting.value = false
  }
}

onMounted(load)
</script>
