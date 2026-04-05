<template>
  <form @submit.prevent="$emit('submit')" class="space-y-6">
    <div class="grid grid-cols-2 gap-4">
      <div class="col-span-2">
        <label class="text-sm font-medium">{{ $t('characters.name') }}</label>
        <input
          v-model="form.name"
          required
          class="w-full mt-1 px-3 py-2 rounded border border-input bg-background"
          :placeholder="$t('entities.namePlaceholder')"
        />
      </div>
      <div>
        <label class="text-sm font-medium">{{ $t('entities.typeRequired') }}</label>
        <select
          v-model="form.type"
          required
          class="w-full mt-1 px-3 py-2 rounded border border-input bg-background"
          @change="onTypeChange"
        >
          <option v-for="t in entityTypes" :key="t.slug" :value="t.slug">{{ t.name }}</option>
          <option value="note">{{ $t('entities.note') }}</option>
        </select>
      </div>
      <div v-if="typeTemplates.length" class="col-span-2">
        <label class="text-sm font-medium">{{ $t('templates.noTemplate') }}</label>
        <select
          v-model="form.templateId"
          class="w-full mt-1 px-3 py-2 rounded border border-input bg-background"
          @change="onTemplateChange"
        >
          <option value="">{{ $t('templates.noTemplate') }}</option>
          <option v-for="tpl in typeTemplates" :key="tpl.id" :value="tpl.id">{{ tpl.name }}</option>
        </select>
      </div>

      <div>
        <label class="text-sm font-medium">{{ $t('characters.visibility') }}</label>
        <select
          v-model="form.visibility"
          class="w-full mt-1 px-3 py-2 rounded border border-input bg-background"
        >
          <option value="members">{{ $t('characters.visibilityMembers') }}</option>
          <option value="public">{{ $t('characters.visibilityPublic') }}</option>
          <option value="editors">{{ $t('characters.visibilityEditors') }}</option>
          <option value="dm_only">{{ $t('characters.visibilityDmOnly') }}</option>
          <option value="private">{{ $t('characters.visibilityPrivate') }}</option>
        </select>
      </div>
      <div class="col-span-2">
        <label class="text-sm font-medium">{{ $t('entities.tags') }}</label>
        <input
          v-model="form.tagsRaw"
          class="w-full mt-1 px-3 py-2 rounded border border-input bg-background"
          :placeholder="$t('entities.tagsPlaceholder')"
        />
      </div>
    </div>

    <!-- Dynamic template fields -->
    <div v-if="activeTemplate" class="space-y-4 p-4 rounded border border-border bg-accent/10">
      <p class="text-xs text-muted-foreground">
        {{ $t('templates.templateFields') }}: {{ activeTemplate.name }}
      </p>
      <div v-for="field in activeTemplateFields" :key="field.id" class="space-y-1">
        <label class="text-sm font-medium"
          >{{ field.label
          }}<span v-if="field.required" class="text-destructive ml-0.5">*</span></label
        >
        <textarea
          v-if="field.fieldType === 'textarea'"
          v-model="templateFieldValues[field.key]"
          rows="3"
          class="w-full px-3 py-2 rounded border border-input bg-background text-sm"
        />
        <input
          v-else-if="field.fieldType === 'number'"
          v-model="templateFieldValues[field.key]"
          type="number"
          class="w-full px-3 py-2 rounded border border-input bg-background text-sm"
        />
        <select
          v-else-if="field.fieldType === 'select'"
          v-model="templateFieldValues[field.key]"
          class="w-full px-3 py-2 rounded border border-input bg-background text-sm"
        >
          <option v-for="opt in fieldOptions(field)" :key="opt" :value="opt">{{ opt }}</option>
        </select>
        <input
          v-else-if="field.fieldType === 'checkbox'"
          v-model="templateFieldValues[field.key]"
          type="checkbox"
          class="rounded"
        />
        <input
          v-else
          v-model="templateFieldValues[field.key]"
          type="text"
          class="w-full px-3 py-2 rounded border border-input bg-background text-sm"
        />
      </div>
    </div>

    <div>
      <label class="text-sm font-medium">{{ $t('entities.content') }}</label>
      <MarkdownEditor
        v-model="form.content"
        :placeholder="$t('entities.contentPlaceholder')"
        :campaign-id="campaignId"
        :draft-key="draftKey"
        :collaborative="collaborative"
        :document-name="documentName"
        :user-name="userName"
        :user-color="userColor"
        class="mt-1"
      />
    </div>

    <div class="flex justify-end gap-2">
      <slot name="cancel" />
      <Button type="submit" :disabled="submitting">{{
        submitting ? $t('common.saving') : submitLabel
      }}</Button>
    </div>
  </form>
</template>

<script setup lang="ts">
const props = defineProps<{
  modelValue: {
    name: string
    type: string
    visibility: string
    tagsRaw: string
    content: string
    templateId?: string
    templateFields?: Record<string, unknown>
  }
  campaignId: string
  entitySlug?: string
  submitLabel?: string
  submitting?: boolean
  collaborative?: boolean
  documentName?: string
  userName?: string
  userColor?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: typeof props.modelValue]
  submit: []
}>()

const api = useCampaignApi(props.campaignId)
const entityTypes = ref<any[]>([])
const allTemplates = ref<any[]>([])
const activeTemplate = ref<any>(null)
const activeTemplateFields = ref<any[]>([])
const templateFieldValues = ref<Record<string, unknown>>({})

const form = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
})

const typeTemplates = computed(() =>
  allTemplates.value.filter((t) => t.entityTypeSlug === form.value.type),
)

const draftKey = computed(
  () => `aleph:draft:${props.campaignId}:entity:${props.entitySlug ?? 'new'}`,
)

function onTypeChange() {
  form.value.templateId = ''
  activeTemplate.value = null
  activeTemplateFields.value = []
  templateFieldValues.value = {}
}

async function onTemplateChange() {
  const tid = form.value.templateId
  if (!tid) {
    activeTemplate.value = null
    activeTemplateFields.value = []
    templateFieldValues.value = {}
    return
  }
  try {
    const tpl = await api.getTemplate(tid)
    activeTemplate.value = tpl
    activeTemplateFields.value = tpl.fields ?? []
    templateFieldValues.value = {}
    // Emit templateFields as part of form
    emit('update:modelValue', { ...props.modelValue, templateId: tid, templateFields: {} })
  } catch {}
}

function fieldOptions(field: any): string[] {
  try {
    if (Array.isArray(field.optionsJson)) return field.optionsJson
    if (typeof field.optionsJson === 'string') return JSON.parse(field.optionsJson)
  } catch {}
  return []
}

// Sync templateFieldValues back to form
watch(
  templateFieldValues,
  (vals) => {
    emit('update:modelValue', { ...props.modelValue, templateFields: { ...vals } })
  },
  { deep: true },
)

function clearDraft() {
  try {
    localStorage.removeItem(draftKey.value)
  } catch {
    /* ignore */
  }
}

defineExpose({ clearDraft })

onMounted(async () => {
  try {
    const [types, templates] = await Promise.all([api.getEntityTypes(), api.getTemplates()])
    entityTypes.value = types
    allTemplates.value = templates
  } catch {
    entityTypes.value = []
    allTemplates.value = []
  }
})
</script>
