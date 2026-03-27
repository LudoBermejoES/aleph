<template>
  <form @submit.prevent="$emit('submit')" class="space-y-6">
    <div class="grid grid-cols-2 gap-4">
      <div class="col-span-2">
        <label class="text-sm font-medium">{{ $t('locations.name') }}</label>
        <input v-model="form.name" required class="w-full mt-1 px-3 py-2 rounded border border-input bg-background" :placeholder="$t('locations.namePlaceholder')" />
      </div>
      <div>
        <label class="text-sm font-medium">{{ $t('locations.subtype') }}</label>
        <select v-model="form.subtype" class="w-full mt-1 px-3 py-2 rounded border border-input bg-background">
          <option v-for="s in subtypes" :key="s" :value="s">{{ $t(`locations.subtypes.${s}`) }}</option>
        </select>
      </div>
      <div>
        <label class="text-sm font-medium">{{ $t('locations.visibility') }}</label>
        <select v-model="form.visibility" class="w-full mt-1 px-3 py-2 rounded border border-input bg-background">
          <option value="members">{{ $t('characters.visibilityMembers') }}</option>
          <option value="public">{{ $t('characters.visibilityPublic') }}</option>
          <option value="editors">{{ $t('characters.visibilityEditors') }}</option>
          <option value="dm_only">{{ $t('characters.visibilityDmOnly') }}</option>
          <option value="private">{{ $t('characters.visibilityPrivate') }}</option>
        </select>
      </div>
      <div class="col-span-2">
        <label class="text-sm font-medium">{{ $t('locations.parent') }}</label>
        <select v-model="form.parentId" class="w-full mt-1 px-3 py-2 rounded border border-input bg-background">
          <option value="">{{ $t('locations.noParent') }}</option>
          <option v-for="loc in availableParents" :key="loc.id" :value="loc.id">{{ loc.name }}</option>
        </select>
      </div>
    </div>

    <div>
      <label class="text-sm font-medium">{{ $t('locations.description') }}</label>
      <MarkdownEditor v-model="form.content" :placeholder="$t('locations.descriptionPlaceholder')" :campaign-id="campaignId" :draft-key="draftKey" class="mt-1" />
    </div>

    <div class="flex justify-end gap-2">
      <slot name="cancel" />
      <Button type="submit" :disabled="submitting">{{ submitting ? $t('common.saving') : submitLabel }}</Button>
    </div>
  </form>
</template>

<script setup lang="ts">
const SUBTYPES = ['country', 'region', 'city', 'town', 'village', 'dungeon', 'lair', 'building', 'room', 'wilderness', 'other']

const props = defineProps<{
  modelValue: { name: string; subtype: string; parentId: string; visibility: string; content: string }
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
const availableParents = ref<any[]>([])

const form = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
})

const draftKey = computed(() => `aleph:draft:${props.campaignId}:location:${props.locationSlug ?? 'new'}`)

function clearDraft() {
  try { localStorage.removeItem(draftKey.value) } catch { /* ignore */ }
}

defineExpose({ clearDraft })

onMounted(async () => {
  try {
    const locs = await useCampaignApi(props.campaignId).getLocations()
    // Exclude self from parent options when editing
    availableParents.value = locs.filter((l: any) => l.slug !== props.locationSlug)
  } catch {
    availableParents.value = []
  }
})
</script>
