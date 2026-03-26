<template>
  <form @submit.prevent="$emit('submit')" class="space-y-6">
    <div class="grid grid-cols-2 gap-4">
      <div>
        <label class="text-sm font-medium">{{ $t('relations.sourceEntity') }}</label>
        <input v-model="search.source" :placeholder="$t('relations.searchEntities')" class="w-full mt-1 px-3 py-2 rounded border border-input bg-background" @input="searchEntities('source')" />
        <div v-if="search.sourceResults.length" class="border border-border rounded mt-1 max-h-40 overflow-y-auto">
          <button v-for="e in search.sourceResults" :key="e.id" type="button" @click="selectEntity('source', e)" class="block w-full text-left px-3 py-2 text-sm hover:bg-accent">
            {{ e.name }} <span class="text-xs text-muted-foreground">{{ e.type }}</span>
          </button>
        </div>
        <p v-if="form.sourceEntityName" class="text-xs text-primary mt-1">Selected: {{ form.sourceEntityName }}</p>
      </div>
      <div>
        <label class="text-sm font-medium">{{ $t('relations.targetEntity') }}</label>
        <input v-model="search.target" :placeholder="$t('relations.searchEntities')" class="w-full mt-1 px-3 py-2 rounded border border-input bg-background" @input="searchEntities('target')" />
        <div v-if="search.targetResults.length" class="border border-border rounded mt-1 max-h-40 overflow-y-auto">
          <button v-for="e in search.targetResults" :key="e.id" type="button" @click="selectEntity('target', e)" class="block w-full text-left px-3 py-2 text-sm hover:bg-accent">
            {{ e.name }} <span class="text-xs text-muted-foreground">{{ e.type }}</span>
          </button>
        </div>
        <p v-if="form.targetEntityName" class="text-xs text-primary mt-1">Selected: {{ form.targetEntityName }}</p>
      </div>
    </div>
    <div>
      <label class="text-sm font-medium">{{ $t('relations.relationType') }}</label>
      <select v-model="form.relationTypeId" class="w-full mt-1 px-3 py-2 rounded border border-input bg-background">
        <option value="">{{ $t('relations.selectType') }}</option>
        <option v-for="rt in relationTypes" :key="rt.id" :value="rt.id">{{ rt.name }}</option>
      </select>
    </div>
    <div class="grid grid-cols-2 gap-4">
      <div>
        <label class="text-sm font-medium">{{ $t('relations.forwardLabel') }}</label>
        <input v-model="form.forwardLabel" class="w-full mt-1 px-3 py-2 rounded border border-input bg-background" :placeholder="$t('relations.forwardLabelPlaceholder')" />
      </div>
      <div>
        <label class="text-sm font-medium">{{ $t('relations.reverseLabel') }}</label>
        <input v-model="form.reverseLabel" class="w-full mt-1 px-3 py-2 rounded border border-input bg-background" :placeholder="$t('relations.forwardLabelPlaceholder')" />
      </div>
    </div>
    <div>
      <label class="text-sm font-medium">{{ $t('relations.attitude', { value: form.attitude }) }}</label>
      <input v-model.number="form.attitude" type="range" min="-100" max="100" class="w-full mt-1" />
      <div class="flex justify-between text-xs text-muted-foreground">
        <span>{{ $t('relations.hostile') }}</span>
        <span>{{ $t('relations.neutral') }}</span>
        <span>{{ $t('relations.friendly') }}</span>
      </div>
    </div>
    <div>
      <label class="text-sm font-medium">{{ $t('characters.description') }}</label>
      <textarea v-model="form.description" rows="3" class="w-full mt-1 px-3 py-2 rounded border border-input bg-background" placeholder="Optional description..." />
    </div>
    <div class="flex justify-end gap-2">
      <slot name="cancel" />
      <Button type="submit" :disabled="submitting || !form.sourceEntityId || !form.targetEntityId">
        {{ submitting ? $t('common.saving') : submitLabel }}
      </Button>
    </div>
  </form>
</template>

<script setup lang="ts">
const props = defineProps<{
  modelValue: { sourceEntityId: string; sourceEntityName: string; targetEntityId: string; targetEntityName: string; forwardLabel: string; reverseLabel: string; relationTypeId: string; attitude: number; description: string }
  campaignId: string
  submitLabel?: string
  submitting?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: typeof props.modelValue]
  submit: []
}>()

const relationTypes = ref<any[]>([])
const search = ref({ source: '', sourceResults: [] as any[], target: '', targetResults: [] as any[] })

const form = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
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
      const res = await useCampaignApi(props.campaignId).getEntities({ search: q, limit: '10' })
      const results = res.entities
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

onMounted(async () => {
  try { relationTypes.value = await useCampaignApi(props.campaignId).getRelationTypes() } catch { relationTypes.value = [] }
})
</script>
