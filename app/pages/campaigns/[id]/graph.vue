<template>
  <div class="p-8">
    <div class="flex items-center gap-2 text-sm text-muted-foreground mb-1">
      <NuxtLink :to="`/campaigns/${campaignId}`" class="hover:text-primary">Campaign</NuxtLink>
      <span>/</span>
      <span>Relationship Graph</span>
    </div>

    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold">Relationship Graph</h1>
      <Dialog v-model:open="showCreate">
        <DialogTrigger as-child><Button data-testid="new-relation-btn">New Relation</Button></DialogTrigger>
        <DialogContent class="max-w-lg">
          <DialogHeader><DialogTitle>Create Relation</DialogTitle></DialogHeader>
          <form @submit.prevent="createRelation" class="space-y-4">
            <div>
              <label class="text-sm font-medium">Source Entity *</label>
              <input v-model="relSearch.source" placeholder="Search entities..." class="w-full mt-1 px-3 py-2 rounded border border-input bg-background" @input="searchEntities('source')" />
              <div v-if="relSearch.sourceResults.length" class="border border-border rounded mt-1 max-h-32 overflow-y-auto">
                <button v-for="e in relSearch.sourceResults" :key="e.id" type="button" @click="selectEntity('source', e)" class="block w-full text-left px-3 py-1.5 text-sm hover:bg-accent">
                  {{ e.name }} <span class="text-xs text-muted-foreground">{{ e.type }}</span>
                </button>
              </div>
              <p v-if="relForm.sourceEntityName" class="text-xs text-muted-foreground mt-1">Selected: {{ relForm.sourceEntityName }}</p>
            </div>
            <div>
              <label class="text-sm font-medium">Target Entity *</label>
              <input v-model="relSearch.target" placeholder="Search entities..." class="w-full mt-1 px-3 py-2 rounded border border-input bg-background" @input="searchEntities('target')" />
              <div v-if="relSearch.targetResults.length" class="border border-border rounded mt-1 max-h-32 overflow-y-auto">
                <button v-for="e in relSearch.targetResults" :key="e.id" type="button" @click="selectEntity('target', e)" class="block w-full text-left px-3 py-1.5 text-sm hover:bg-accent">
                  {{ e.name }} <span class="text-xs text-muted-foreground">{{ e.type }}</span>
                </button>
              </div>
              <p v-if="relForm.targetEntityName" class="text-xs text-muted-foreground mt-1">Selected: {{ relForm.targetEntityName }}</p>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="text-sm font-medium">Forward Label</label>
                <input v-model="relForm.forwardLabel" class="w-full mt-1 px-3 py-2 rounded border border-input bg-background" placeholder="allies with" />
              </div>
              <div>
                <label class="text-sm font-medium">Reverse Label</label>
                <input v-model="relForm.reverseLabel" class="w-full mt-1 px-3 py-2 rounded border border-input bg-background" placeholder="allies with" />
              </div>
            </div>
            <div>
              <label class="text-sm font-medium">Relation Type</label>
              <select v-model="relForm.relationTypeId" class="w-full mt-1 px-3 py-2 rounded border border-input bg-background">
                <option value="">-- Select --</option>
                <option v-for="rt in relationTypes" :key="rt.id" :value="rt.id">{{ rt.name }}</option>
              </select>
            </div>
            <div>
              <label class="text-sm font-medium">Attitude: {{ relForm.attitude }}</label>
              <input v-model.number="relForm.attitude" type="range" min="-100" max="100" class="w-full mt-1" />
              <div class="flex justify-between text-xs text-muted-foreground">
                <span>Hostile (-100)</span>
                <span>Neutral (0)</span>
                <span>Friendly (+100)</span>
              </div>
            </div>
            <div class="flex justify-end gap-2">
              <Button type="button" variant="outline" @click="showCreate = false">Cancel</Button>
              <Button type="submit" :disabled="relCreating || !relForm.sourceEntityId || !relForm.targetEntityId">
                {{ relCreating ? 'Creating...' : 'Create' }}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>

    <!-- Filter Panel -->
    <div v-if="graphData && Object.keys(graphData.nodes).length" class="flex gap-4 mb-4 flex-wrap">
      <div class="space-y-1">
        <label class="text-xs font-medium text-muted-foreground">Entity Types</label>
        <div class="flex gap-2">
          <label v-for="t in entityTypes" :key="t" class="flex items-center gap-1 text-xs">
            <input type="checkbox" :checked="selectedTypes.has(t)" @change="toggleType(t)" />
            {{ t }}
          </label>
        </div>
      </div>
    </div>

    <!-- Graph -->
    <div v-if="graphData && Object.keys(filteredNodes).length">
      <EntityGraphView
        :nodes="filteredNodes"
        :edges="filteredEdges"
        :height="600"
        :campaign-id="campaignId"
        @node-click="onNodeClick"
      />
      <p class="text-xs text-muted-foreground mt-2">
        {{ Object.keys(filteredNodes).length }} nodes, {{ Object.keys(filteredEdges).length }} edges
      </p>
    </div>
    <p v-else class="text-muted-foreground text-center py-16">No relationships yet. Click "New Relation" to connect entities.</p>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const campaignId = route.params.id as string
const graphData = ref<any>(null)
const selectedTypes = ref(new Set<string>())

// Relation create
const showCreate = ref(false)
const relCreating = ref(false)
const relationTypes = ref<any[]>([])
const relForm = ref({
  sourceEntityId: '', sourceEntityName: '',
  targetEntityId: '', targetEntityName: '',
  forwardLabel: 'related to', reverseLabel: 'related to',
  relationTypeId: '', attitude: 0,
})
const relSearch = ref({
  source: '', sourceResults: [] as any[],
  target: '', targetResults: [] as any[],
})

let searchTimeout: ReturnType<typeof setTimeout> | null = null
function searchEntities(field: 'source' | 'target') {
  if (searchTimeout) clearTimeout(searchTimeout)
  searchTimeout = setTimeout(async () => {
    const q = field === 'source' ? relSearch.value.source : relSearch.value.target
    if (q.length < 2) {
      if (field === 'source') relSearch.value.sourceResults = []
      else relSearch.value.targetResults = []
      return
    }
    try {
      const res = await $fetch(`/api/campaigns/${campaignId}/entities`, { params: { search: q, limit: 10 } }) as any
      const results = res.entities || res || []
      if (field === 'source') relSearch.value.sourceResults = results
      else relSearch.value.targetResults = results
    } catch { /* ignore */ }
  }, 300)
}

function selectEntity(field: 'source' | 'target', entity: any) {
  if (field === 'source') {
    relForm.value.sourceEntityId = entity.id
    relForm.value.sourceEntityName = entity.name
    relSearch.value.source = entity.name
    relSearch.value.sourceResults = []
  } else {
    relForm.value.targetEntityId = entity.id
    relForm.value.targetEntityName = entity.name
    relSearch.value.target = entity.name
    relSearch.value.targetResults = []
  }
}

async function createRelation() {
  relCreating.value = true
  try {
    await $fetch(`/api/campaigns/${campaignId}/relations`, {
      method: 'POST',
      body: {
        sourceEntityId: relForm.value.sourceEntityId,
        targetEntityId: relForm.value.targetEntityId,
        forwardLabel: relForm.value.forwardLabel,
        reverseLabel: relForm.value.reverseLabel,
        relationTypeId: relForm.value.relationTypeId || undefined,
        attitude: relForm.value.attitude,
      },
    })
    showCreate.value = false
    relForm.value = { sourceEntityId: '', sourceEntityName: '', targetEntityId: '', targetEntityName: '', forwardLabel: 'related to', reverseLabel: 'related to', relationTypeId: '', attitude: 0 }
    await load()
  } catch (e: any) {
    alert(e.data?.message || 'Failed to create relation')
  } finally {
    relCreating.value = false
  }
}

// Graph
const entityTypes = computed(() => {
  if (!graphData.value) return []
  const types = new Set<string>()
  for (const node of Object.values(graphData.value.nodes) as any[]) {
    types.add(node.type)
  }
  return Array.from(types).sort()
})

const filteredNodes = computed(() => {
  if (!graphData.value) return {}
  if (selectedTypes.value.size === 0) return graphData.value.nodes
  const result: Record<string, any> = {}
  for (const [id, node] of Object.entries(graphData.value.nodes) as [string, any][]) {
    if (selectedTypes.value.has(node.type)) result[id] = node
  }
  return result
})

const filteredEdges = computed(() => {
  if (!graphData.value) return {}
  const nodeIds = new Set(Object.keys(filteredNodes.value))
  const result: Record<string, any> = {}
  for (const [id, edge] of Object.entries(graphData.value.edges) as [string, any][]) {
    if (nodeIds.has(edge.source) && nodeIds.has(edge.target)) result[id] = edge
  }
  return result
})

function toggleType(type: string) {
  const s = new Set(selectedTypes.value)
  if (s.has(type)) s.delete(type)
  else s.add(type)
  selectedTypes.value = s
}

function onNodeClick(nodeId: string) {
  // TODO: navigate to entity by ID
}

async function load() {
  try { graphData.value = await $fetch(`/api/campaigns/${campaignId}/graph`) } catch { graphData.value = null }
  if (graphData.value) {
    selectedTypes.value = new Set(entityTypes.value)
  }
  try { relationTypes.value = await $fetch(`/api/campaigns/${campaignId}/relation-types`) as any[] } catch { relationTypes.value = [] }
}

onMounted(load)
</script>
