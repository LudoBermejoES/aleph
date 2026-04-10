<template>
  <form class="space-y-6" @submit.prevent="$emit('submit')">
    <div class="grid grid-cols-2 gap-4">
      <div class="col-span-2">
        <label class="text-sm font-medium">{{ $t('locations.name') }}</label>
        <input
          v-model="form.name"
          required
          class="w-full mt-1 px-3 py-2 rounded border border-input bg-background"
          :placeholder="$t('locations.namePlaceholder')"
        />
      </div>
      <div>
        <label class="text-sm font-medium">{{ $t('locations.subtype') }}</label>
        <select
          v-model="form.subtype"
          class="w-full mt-1 px-3 py-2 rounded border border-input bg-background"
        >
          <option v-for="s in subtypes" :key="s" :value="s">
            {{ $t(`locations.subtypes.${s}`) }}
          </option>
        </select>
      </div>
      <div>
        <label class="text-sm font-medium">{{ $t('locations.visibility') }}</label>
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
        <label class="text-sm font-medium">{{ $t('locations.parent') }}</label>
        <select
          v-model="form.parentId"
          class="w-full mt-1 px-3 py-2 rounded border border-input bg-background"
        >
          <option value="">{{ $t('locations.noParent') }}</option>
          <option v-for="loc in availableParents" :key="loc.id" :value="loc.id">
            {{ loc.name }}
          </option>
        </select>
      </div>
    </div>

    <div>
      <label class="text-sm font-medium">{{ $t('locations.description') }}</label>
      <MarkdownEditor
        v-model="form.content"
        :placeholder="$t('locations.descriptionPlaceholder')"
        :campaign-id="campaignId"
        :draft-key="draftKey"
        class="mt-1"
      />
    </div>

    <!-- Template selector -->
    <div v-if="locationTemplates.length">
      <label class="text-sm font-medium">{{ $t('templates.noTemplate') }}</label>
      <select
        v-model="form.templateId"
        class="w-full mt-1 px-3 py-2 rounded border border-input bg-background"
      >
        <option value="">{{ $t('templates.noTemplate') }}</option>
        <option v-for="tpl in locationTemplates" :key="tpl.id" :value="tpl.id">
          {{ tpl.name }}
        </option>
      </select>
    </div>

    <!-- Template fields -->
    <TemplateFieldsForm
      v-if="form.templateId"
      :campaign-id="campaignId"
      :template-id="form.templateId"
      :model-value="form.templateFields ?? {}"
      @update:model-value="
        (vals: Record<string, unknown>) =>
          emit('update:modelValue', { ...form, templateFields: vals })
      "
    />

    <div class="flex justify-end gap-2">
      <slot name="cancel"></slot>
      <Button type="submit" :disabled="submitting">{{
        submitting ? $t('common.saving') : submitLabel
      }}</Button>
    </div>
  </form>
</template>

<script setup lang="ts">
const SUBTYPES = [
  'country',
  'region',
  'city',
  'town',
  'village',
  'dungeon',
  'lair',
  'building',
  'room',
  'wilderness',
  'other',
]

interface LocationTemplate {
  id: string
  name: string
  entityTypeSlug: string
  isDefault: boolean
}

const props = defineProps<{
  modelValue: {
    name: string
    subtype: string
    parentId: string
    visibility: string
    content: string
    templateId?: string
    templateFields?: Record<string, unknown>
  }
  campaignId: string
  locationSlug?: string
  submitLabel?: string
  submitting?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: typeof props.modelValue]
  submit: []
}>()

const subtypes = SUBTYPES
const availableParents = ref<{ id: string; name: string; slug: string }[]>([])
const locationTemplates = ref<LocationTemplate[]>([])

const form = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
})

const draftKey = computed(
  () => `aleph:draft:${props.campaignId}:location:${props.locationSlug ?? 'new'}`,
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
  const api = useCampaignApi(props.campaignId)
  try {
    const [locs, templates] = await Promise.all([api.getLocations(), api.getTemplates()])
    availableParents.value = (locs as typeof availableParents.value).filter(
      (l) => l.slug !== props.locationSlug,
    )
    locationTemplates.value = (templates as LocationTemplate[]).filter(
      (t) => t.entityTypeSlug === 'location',
    )
    // Auto-select default template on create
    if (!props.locationSlug && !form.value.templateId) {
      const defaultTpl = locationTemplates.value.find((t) => t.isDefault)
      if (defaultTpl) {
        emit('update:modelValue', { ...form.value, templateId: defaultTpl.id })
      }
    }
  } catch {
    availableParents.value = []
  }
})
</script>
