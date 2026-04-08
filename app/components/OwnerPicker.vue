<template>
  <div class="relative">
    <input
      v-model="search"
      type="text"
      :placeholder="selectedLabel || $t('inventories.searchOwner')"
      class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
      :aria-label="$t('inventories.selectOwner')"
      @focus="open = true"
      @blur="onBlur"
      @input="open = true"
    />
    <div
      v-if="open && filteredOptions.length"
      class="absolute z-50 mt-1 w-full bg-background border border-border rounded-md shadow-lg max-h-48 overflow-y-auto"
    >
      <button
        v-for="opt in filteredOptions"
        :key="opt.id"
        type="button"
        class="block w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors"
        @mousedown.prevent="select(opt)"
      >
        <span class="font-medium">{{ opt.name }}</span>
        <span v-if="opt.type" class="ml-2 text-xs text-muted-foreground">{{ opt.type }}</span>
      </button>
    </div>
    <div
      v-if="open && !filteredOptions.length && search"
      class="absolute z-50 mt-1 w-full bg-background border border-border rounded-md shadow-lg px-3 py-2 text-sm text-muted-foreground"
    >
      {{ $t('common.noResults') }}
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  campaignId: string
  ownerType: string
  modelValue: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const api = useCampaignApi(props.campaignId)
const options = ref<{ id: string; name: string; type?: string }[]>([])
const search = ref('')
const open = ref(false)

const selectedLabel = computed(() => {
  if (!props.modelValue) return ''
  const found = options.value.find((o) => o.id === props.modelValue)
  return found?.name || ''
})

const filteredOptions = computed(() => {
  const q = search.value.toLowerCase()
  if (!q) return options.value
  return options.value.filter((o) => o.name.toLowerCase().includes(q))
})

function select(opt: { id: string; name: string }) {
  emit('update:modelValue', opt.id)
  search.value = opt.name
  open.value = false
}

function onBlur() {
  setTimeout(() => {
    open.value = false
  }, 150)
}

async function loadOptions() {
  options.value = []
  if (props.ownerType === 'party') {
    options.value = [{ id: props.campaignId, name: 'Party' }]
    if (!props.modelValue) emit('update:modelValue', props.campaignId)
    search.value = 'Party'
  } else if (props.ownerType === 'character') {
    const chars = await api.getCharacters().catch(() => [])
    options.value = chars.map((c) => ({ id: c.id, name: c.name, type: c.characterType }))
  } else if (props.ownerType === 'faction') {
    const result = await api.getEntities({ type: 'faction' }).catch(() => ({ entities: [] }))
    options.value = (result.entities || []).map((e) => ({
      id: e.id,
      name: e.name,
      type: 'faction',
    }))
  } else if (props.ownerType === 'shop') {
    const shops = await api.getShops().catch(() => [])
    options.value = shops.map((s) => ({ id: s.id, name: s.name, type: 'shop' }))
  }
  // Restore selected label
  if (props.modelValue) {
    const found = options.value.find((o) => o.id === props.modelValue)
    if (found) search.value = found.name
  }
}

watch(
  () => props.ownerType,
  () => {
    emit('update:modelValue', '')
    search.value = ''
    loadOptions()
  },
  { immediate: true },
)

watch(
  () => props.modelValue,
  (val) => {
    if (!val) {
      search.value = ''
      return
    }
    const found = options.value.find((o) => o.id === val)
    if (found) search.value = found.name
  },
)
</script>
