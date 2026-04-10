<template>
  <div
    v-if="templateId && template"
    class="space-y-4 p-4 rounded border border-border bg-accent/10"
    data-testid="template-fields-form"
  >
    <p class="text-xs text-muted-foreground">
      {{ $t('templates.templateFields') }}: {{ template.name }}
    </p>
    <template v-for="field in template.fields" :key="field.id">
      <!-- Section divider -->
      <div v-if="field.fieldType === 'section'" class="pt-2 border-t border-border">
        <span class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{{
          field.label
        }}</span>
      </div>
      <!-- Editable field -->
      <div v-else class="space-y-1">
        <label class="text-sm font-medium"
          >{{ field.label
          }}<span v-if="field.required" class="text-destructive ml-0.5">*</span></label
        >
        <textarea
          v-if="field.fieldType === 'textarea'"
          :value="String(localValues[field.key] ?? '')"
          rows="3"
          class="w-full px-3 py-2 rounded border border-input bg-background text-sm"
          @input="onInput(field.key, ($event.target as HTMLTextAreaElement).value)"
        ></textarea>
        <input
          v-else-if="field.fieldType === 'number'"
          type="number"
          :value="localValues[field.key] as number"
          class="w-full px-3 py-2 rounded border border-input bg-background text-sm"
          @input="onInput(field.key, Number(($event.target as HTMLInputElement).value))"
        />
        <select
          v-else-if="field.fieldType === 'select'"
          :value="String(localValues[field.key] ?? '')"
          class="w-full px-3 py-2 rounded border border-input bg-background text-sm"
          @change="onInput(field.key, ($event.target as HTMLSelectElement).value)"
        >
          <option value="">—</option>
          <option v-for="opt in fieldOptions(field)" :key="opt" :value="opt">{{ opt }}</option>
        </select>
        <input
          v-else-if="field.fieldType === 'checkbox'"
          type="checkbox"
          :checked="Boolean(localValues[field.key])"
          class="rounded"
          @change="onInput(field.key, ($event.target as HTMLInputElement).checked)"
        />
        <input
          v-else-if="field.fieldType === 'date'"
          type="date"
          :value="String(localValues[field.key] ?? '')"
          class="w-full px-3 py-2 rounded border border-input bg-background text-sm"
          @input="onInput(field.key, ($event.target as HTMLInputElement).value)"
        />
        <!-- text and entity_reference -->
        <input
          v-else
          type="text"
          :value="String(localValues[field.key] ?? '')"
          :placeholder="field.fieldType === 'entity_reference' ? 'entity-slug' : ''"
          class="w-full px-3 py-2 rounded border border-input bg-background text-sm"
          @input="onInput(field.key, ($event.target as HTMLInputElement).value)"
        />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
interface TemplateField {
  id: string
  templateId: string
  label: string
  key: string
  fieldType:
    | 'text'
    | 'textarea'
    | 'number'
    | 'date'
    | 'checkbox'
    | 'select'
    | 'entity_reference'
    | 'section'
  optionsJson: string | null
  sortOrder: number
  required: boolean
}

interface Template {
  id: string
  name: string
  fields: TemplateField[]
}

const props = defineProps<{
  campaignId: string
  templateId: string | null | undefined
  modelValue: Record<string, unknown>
}>()

const emit = defineEmits<{
  'update:modelValue': [value: Record<string, unknown>]
}>()

const api = useCampaignApi(props.campaignId)
const template = ref<Template | null>(null)
const localValues = ref<Record<string, unknown>>({ ...props.modelValue })

watch(
  () => props.modelValue,
  (val) => {
    localValues.value = { ...val }
  },
)

function onInput(key: string, value: unknown) {
  localValues.value = { ...localValues.value, [key]: value }
  // Emit only non-section field values
  const nonSectionKeys = (template.value?.fields ?? [])
    .filter((f) => f.fieldType !== 'section')
    .map((f) => f.key)
  const emitted: Record<string, unknown> = {}
  for (const k of nonSectionKeys) {
    if (localValues.value[k] !== undefined) emitted[k] = localValues.value[k]
  }
  emit('update:modelValue', emitted)
}

function fieldOptions(field: TemplateField): string[] {
  try {
    if (Array.isArray(field.optionsJson)) return field.optionsJson as string[]
    if (typeof field.optionsJson === 'string') return JSON.parse(field.optionsJson) as string[]
  } catch {
    // ignore
  }
  return []
}

async function loadTemplate(id: string) {
  try {
    const data = await api.getTemplate(id)
    template.value = data as unknown as Template
    // Pre-populate from modelValue
    localValues.value = { ...props.modelValue }
  } catch {
    template.value = null
  }
}

watch(
  () => props.templateId,
  (id) => {
    if (id) loadTemplate(id)
    else template.value = null
  },
  { immediate: true },
)
</script>
