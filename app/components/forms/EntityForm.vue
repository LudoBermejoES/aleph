<template>
  <form class="space-y-6" @submit.prevent="$emit('submit')">
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
    <TemplateFieldsForm
      v-if="form.templateId"
      :campaign-id="campaignId"
      :template-id="form.templateId"
      :model-value="templateFieldValues"
      @update:model-value="onTemplateFieldsUpdate"
    />

    <slot name="extra-fields"></slot>

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
      <slot name="cancel"></slot>
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

interface EntityType {
  slug: string
  name: string
}
interface Template {
  id: string
  name: string
  entityTypeSlug: string
}

const api = useCampaignApi(props.campaignId)
const entityTypes = ref<EntityType[]>([])
const allTemplates = ref<Template[]>([])
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
  templateFieldValues.value = {}
}

function onTemplateChange() {
  const tid = form.value.templateId
  if (!tid) {
    templateFieldValues.value = {}
    return
  }
  // Pre-populate from existing stored values when editing; reset to {} only on new template
  templateFieldValues.value = { ...(props.modelValue.templateFields ?? {}) }
  emit('update:modelValue', {
    ...props.modelValue,
    templateId: tid,
    templateFields: templateFieldValues.value,
  })
}

function onTemplateFieldsUpdate(vals: Record<string, unknown>) {
  templateFieldValues.value = vals
  emit('update:modelValue', { ...props.modelValue, templateFields: vals })
}

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
