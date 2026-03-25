<template>
  <div class="p-8 max-w-3xl">
    <div class="flex items-center gap-2 text-sm text-muted-foreground mb-4">
      <NuxtLink :to="`/campaigns/${campaignId}`" class="hover:text-primary">Campaign</NuxtLink>
      <span>/</span>
      <NuxtLink :to="`/campaigns/${campaignId}/graph`" class="hover:text-primary">Graph</NuxtLink>
      <span>/</span><span>New Relation</span>
    </div>

    <h1 class="text-2xl font-bold mb-6">Create Relation</h1>

    <form @submit.prevent="create" class="space-y-6">
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="text-sm font-medium">Source Entity *</label>
          <input v-model="search.source" placeholder="Search entities..." class="w-full mt-1 px-3 py-2 rounded border border-input bg-background" @input="searchEntities('source')" />
          <div v-if="search.sourceResults.length" class="border border-border rounded mt-1 max-h-40 overflow-y-auto">
            <button v-for="e in search.sourceResults" :key="e.id" type="button" @click="selectEntity('source', e)" class="block w-full text-left px-3 py-2 text-sm hover:bg-accent">
              {{ e.name }} <span class="text-xs text-muted-foreground">{{ e.type }}</span>
            </button>
          </div>
          <p v-if="form.sourceEntityName" class="text-xs text-primary mt-1">Selected: {{ form.sourceEntityName }}</p>
        </div>
        <div>
          <label class="text-sm font-medium">Target Entity *</label>
          <input v-model="search.target" placeholder="Search entities..." class="w-full mt-1 px-3 py-2 rounded border border-input bg-background" @input="searchEntities('target')" />
          <div v-if="search.targetResults.length" class="border border-border rounded mt-1 max-h-40 overflow-y-auto">
            <button v-for="e in search.targetResults" :key="e.id" type="button" @click="selectEntity('target', e)" class="block w-full text-left px-3 py-2 text-sm hover:bg-accent">
              {{ e.name }} <span class="text-xs text-muted-foreground">{{ e.type }}</span>
            </button>
          </div>
          <p v-if="form.targetEntityName" class="text-xs text-primary mt-1">Selected: {{ form.targetEntityName }}</p>
        </div>
      </div>

      <div>
        <label class="text-sm font-medium">Relation Type</label>
        <select v-model="form.relationTypeId" class="w-full mt-1 px-3 py-2 rounded border border-input bg-background">
          <option value="">-- Select type --</option>
          <option v-for="rt in relationTypes" :key="rt.id" :value="rt.id">{{ rt.name }}</option>
        </select>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="text-sm font-medium">Forward Label</label>
          <input v-model="form.forwardLabel" class="w-full mt-1 px-3 py-2 rounded border border-input bg-background" placeholder="allies with" />
        </div>
        <div>
          <label class="text-sm font-medium">Reverse Label</label>
          <input v-model="form.reverseLabel" class="w-full mt-1 px-3 py-2 rounded border border-input bg-background" placeholder="allies with" />
        </div>
      </div>

      <div>
        <label class="text-sm font-medium">Attitude: {{ form.attitude }}</label>
        <input v-model.number="form.attitude" type="range" min="-100" max="100" class="w-full mt-1" />
        <div class="flex justify-between text-xs text-muted-foreground">
          <span>Hostile (-100)</span>
          <span>Neutral (0)</span>
          <span>Friendly (+100)</span>
        </div>
      </div>

      <div>
        <label class="text-sm font-medium">Description</label>
        <textarea v-model="form.description" rows="3" class="w-full mt-1 px-3 py-2 rounded border border-input bg-background" placeholder="Optional description of this relationship..." />
      </div>

      <div class="flex justify-end gap-2">
        <NuxtLink :to="`/campaigns/${campaignId}/graph`">
          <Button variant="outline">Cancel</Button>
        </NuxtLink>
        <Button type="submit" :disabled="creating || !form.sourceEntityId || !form.targetEntityId">
          {{ creating ? 'Creating...' : 'Create Relation' }}
        </Button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const router = useRouter()
const campaignId = route.params.id as string
const creating = ref(false)
const relationTypes = ref<any[]>([])

const form = ref({
  sourceEntityId: '', sourceEntityName: '',
  targetEntityId: '', targetEntityName: '',
  forwardLabel: 'related to', reverseLabel: 'related to',
  relationTypeId: '', attitude: 0, description: '',
})

const search = ref({
  source: '', sourceResults: [] as any[],
  target: '', targetResults: [] as any[],
})

let searchTimeout: ReturnType<typeof setTimeout> | null = null
function searchEntities(field: 'source' | 'target') {
  if (searchTimeout) clearTimeout(searchTimeout)
  searchTimeout = setTimeout(async () => {
    const q = field === 'source' ? search.value.source : search.value.target
    if (q.length < 2) {
      if (field === 'source') search.value.sourceResults = []
      else search.value.targetResults = []
      return
    }
    try {
      const res = await $fetch(`/api/campaigns/${campaignId}/entities`, { params: { search: q, limit: 10 } }) as any
      const results = res.entities || res || []
      if (field === 'source') search.value.sourceResults = results
      else search.value.targetResults = results
    } catch { /* ignore */ }
  }, 300)
}

function selectEntity(field: 'source' | 'target', entity: any) {
  if (field === 'source') {
    form.value.sourceEntityId = entity.id
    form.value.sourceEntityName = entity.name
    search.value.source = entity.name
    search.value.sourceResults = []
  } else {
    form.value.targetEntityId = entity.id
    form.value.targetEntityName = entity.name
    search.value.target = entity.name
    search.value.targetResults = []
  }
}

async function create() {
  creating.value = true
  try {
    await $fetch(`/api/campaigns/${campaignId}/relations`, {
      method: 'POST',
      body: {
        sourceEntityId: form.value.sourceEntityId,
        targetEntityId: form.value.targetEntityId,
        forwardLabel: form.value.forwardLabel,
        reverseLabel: form.value.reverseLabel,
        relationTypeId: form.value.relationTypeId || undefined,
        attitude: form.value.attitude,
        description: form.value.description || undefined,
      },
    })
    await router.push(`/campaigns/${campaignId}/graph`)
  } catch (e: any) {
    alert(e.data?.message || 'Failed to create relation')
  } finally {
    creating.value = false
  }
}

onMounted(async () => {
  try { relationTypes.value = await $fetch(`/api/campaigns/${campaignId}/relation-types`) as any[] } catch { relationTypes.value = [] }
})
</script>
