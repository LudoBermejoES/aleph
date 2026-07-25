<template>
  <div v-if="templateId && template" class="mb-6" data-testid="template-fields-display">
    <h2 class="text-lg font-semibold mb-3">{{ $t('templates.properties') }}</h2>
    <table class="w-full text-sm rounded border border-border overflow-hidden">
      <tbody>
        <template v-for="field in template.fields" :key="field.id">
          <!-- Section divider -->
          <tr v-if="field.fieldType === 'section'">
            <td
              colspan="2"
              class="px-3 py-2 bg-muted/50 border-b border-border text-xs font-semibold uppercase tracking-wide text-muted-foreground"
            >
              {{ field.label }}
            </td>
          </tr>
          <!-- Label + value row -->
          <tr v-else class="border-b border-border last:border-b-0 even:bg-muted/20">
            <td class="px-3 py-2 font-medium text-muted-foreground w-1/3 align-top">
              {{ field.label }}
            </td>
            <td class="px-3 py-2 align-top">
              <!-- checkbox -->
              <template v-if="field.fieldType === 'checkbox'">
                {{ fieldValues[field.key] ? $t('common.yes') : $t('common.no') }}
              </template>
              <!-- entity_reference -->
              <template v-else-if="field.fieldType === 'entity_reference'">
                <NuxtLink
                  v-if="fieldValues[field.key]"
                  :to="`/campaigns/${campaignId}/entities/${fieldValues[field.key]}`"
                  class="text-primary hover:underline"
                >
                  {{ fieldValues[field.key] }}
                </NuxtLink>
                <span v-else class="text-muted-foreground italic">—</span>
              </template>
              <!-- all other types: text, textarea, number, date, select -->
              <template v-else>
                <template
                  v-if="fieldValues[field.key] !== undefined && fieldValues[field.key] !== ''"
                >
                  <a
                    v-if="isUrl(String(fieldValues[field.key]))"
                    :href="String(fieldValues[field.key])"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="text-primary hover:underline break-all"
                    >{{ fieldValues[field.key] }}</a
                  >
                  <span v-else>{{ fieldValues[field.key] }}</span>
                </template>
                <span v-else class="text-muted-foreground italic">—</span>
              </template>
            </td>
          </tr>
        </template>
      </tbody>
    </table>
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
}

interface Template {
  id: string
  name: string
  fields: TemplateField[]
}

function isUrl(value: string): boolean {
  return /^https?:\/\//i.test(value.trim())
}

const props = defineProps<{
  campaignId: string
  templateId: string | null | undefined
  fieldValues: Record<string, unknown>
}>()

const api = useCampaignApi(props.campaignId)
const template = ref<Template | null>(null)

async function loadTemplate() {
  if (!props.templateId) return
  try {
    const data = await api.getTemplate(props.templateId)
    template.value = data as unknown as Template
  } catch {
    // 404 or any error — hide the panel silently
    template.value = null
  }
}

watch(
  () => props.templateId,
  (id) => {
    if (id) loadTemplate()
    else template.value = null
  },
  { immediate: true },
)
</script>
