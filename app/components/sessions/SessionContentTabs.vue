<template>
  <div class="mb-6">
    <div class="flex gap-1 mb-4 border-b border-border">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        :class="['px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px', activeContentTab === tab.key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground']"
        @click="activeContentTab = tab.key"
      >
        {{ tab.label }}
      </button>
    </div>
    <div v-if="loading" class="text-sm text-muted-foreground">{{ $t('common.loading') }}</div>
    <div v-else>
      <div class="flex items-center justify-between mb-2">
        <span />
        <Button variant="outline" size="sm" @click="editingContent = !editingContent">
          {{ editingContent ? $t('sessions.previewTab') : $t('sessions.editTab') }}
        </Button>
      </div>
      <textarea v-if="editingContent" v-model="localDraft[activeContentTab]" rows="12"
        :placeholder="$t('sessions.content.empty')"
        class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono" />
      <div v-else class="prose dark:prose-invert max-w-none text-foreground">
        <MDC v-if="localDraft[activeContentTab]" :value="localDraft[activeContentTab]" />
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
  loading: boolean
}>()

const emit = defineEmits<{
  save: [tabKey: string, content: string]
}>()

const activeContentTab = ref(props.tabs[0]?.key ?? 'manual_notes')
const editingContent = ref(false)
const localDraft = ref<Record<string, string>>({ ...props.contentDraft })

watch(() => props.contentDraft, (val) => { localDraft.value = { ...val } }, { deep: true })

function save() {
  emit('save', activeContentTab.value, localDraft.value[activeContentTab.value])
  editingContent.value = false
}
</script>
