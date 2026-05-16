<template>
  <div class="mb-6">
    <div class="flex gap-1 mb-4 border-b border-border">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        :class="[
          'px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px',
          activeContentTab === tab.key
            ? 'border-primary text-primary'
            : 'border-transparent text-muted-foreground hover:text-foreground',
        ]"
        @click="activeContentTab = tab.key"
      >
        {{ tab.label }}
      </button>
    </div>
    <div v-if="loading" class="text-sm text-muted-foreground">{{ $t('common.loading') }}</div>
    <div v-else>
      <div class="flex items-center justify-between mb-2">
        <div class="flex gap-2">
          <Button
            v-if="canGenerate && activeContentTab !== 'manual_notes' && !aiUnavailable"
            variant="outline"
            size="sm"
            :disabled="!localDraft['manual_notes'] || generating"
            :title="!localDraft['manual_notes'] ? $t('sessions.content.noManualNotes') : undefined"
            @click="handleGenerate"
          >
            <span v-if="generating">{{ $t('sessions.content.generating') }}</span>
            <span v-else-if="activeContentTab === 'summary'">{{
              $t('sessions.content.generateSummary')
            }}</span>
            <span v-else>{{ $t('sessions.content.generateAiNotes') }}</span>
          </Button>
        </div>
        <Button variant="outline" size="sm" @click="editingContent = !editingContent">
          {{ editingContent ? $t('sessions.previewTab') : $t('sessions.editTab') }}
        </Button>
      </div>
      <textarea
        v-if="editingContent"
        v-model="localDraft[activeContentTab]"
        rows="12"
        :placeholder="$t('sessions.content.empty')"
        class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
      ></textarea>
      <div v-else class="prose dark:prose-invert max-w-none text-foreground">
        <MDC v-if="displayContent[activeContentTab]" :value="displayContent[activeContentTab]" />
        <p v-else class="text-muted-foreground italic">{{ $t('sessions.content.empty') }}</p>
      </div>
      <Button v-if="editingContent" class="mt-2" @click="save">{{ $t('sessions.saveLog') }}</Button>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  tabs: { key: string; label: string }[]
  contentDraft: Record<string, string>
  renderedDraft?: Record<string, string>
  loading: boolean
  canGenerate?: boolean
}>()

const emit = defineEmits<{
  save: [tabKey: string, content: string]
  generate: [target: string]
}>()

const { t } = useI18n()

const activeContentTab = ref(props.tabs[0]?.key ?? 'manual_notes')

const displayContent = computed(() => {
  const rendered = props.renderedDraft ?? {}
  return Object.fromEntries(
    props.tabs.map((t) => [t.key, rendered[t.key] || localDraft.value[t.key] || '']),
  )
})
const editingContent = ref(false)
const localDraft = ref<Record<string, string>>({ ...props.contentDraft })
const generating = ref(false)
const aiUnavailable = ref(false)

watch(
  () => props.contentDraft,
  (val) => {
    localDraft.value = { ...val }
  },
  { deep: true },
)

function save() {
  emit('save', activeContentTab.value, localDraft.value[activeContentTab.value])
  editingContent.value = false
}

async function handleGenerate() {
  const target = activeContentTab.value
  if (localDraft.value[target] && !confirm(t('sessions.content.generateConfirm'))) return

  generating.value = true
  try {
    emit('generate', target)
  } finally {
    generating.value = false
  }
}

function setGenerating(val: boolean) {
  generating.value = val
}

function setAiUnavailable(val: boolean) {
  aiUnavailable.value = val
}

function updateDraft(target: string, content: string) {
  localDraft.value[target] = content
}

defineExpose({ setGenerating, setAiUnavailable, updateDraft })
</script>
