<template>
  <form @submit.prevent="$emit('submit')" class="space-y-6">
    <div class="grid grid-cols-2 gap-4">
      <div class="col-span-2">
        <label class="text-sm font-medium">{{ $t('characters.name') }}</label>
        <input v-model="form.name" required class="w-full mt-1 px-3 py-2 rounded border border-input bg-background" :placeholder="$t('entities.namePlaceholder')" />
      </div>
      <div>
        <label class="text-sm font-medium">{{ $t('entities.typeRequired') }}</label>
        <select v-model="form.type" required class="w-full mt-1 px-3 py-2 rounded border border-input bg-background">
          <option v-for="t in entityTypes" :key="t.slug" :value="t.slug">{{ t.name }}</option>
          <option value="note">{{ $t('entities.note') }}</option>
        </select>
      </div>
      <div>
        <label class="text-sm font-medium">{{ $t('characters.visibility') }}</label>
        <select v-model="form.visibility" class="w-full mt-1 px-3 py-2 rounded border border-input bg-background">
          <option value="members">{{ $t('characters.visibilityMembers') }}</option>
          <option value="public">{{ $t('characters.visibilityPublic') }}</option>
          <option value="editors">{{ $t('characters.visibilityEditors') }}</option>
          <option value="dm_only">{{ $t('characters.visibilityDmOnly') }}</option>
          <option value="private">{{ $t('characters.visibilityPrivate') }}</option>
        </select>
      </div>
      <div class="col-span-2">
        <label class="text-sm font-medium">{{ $t('entities.tags') }}</label>
        <input v-model="form.tagsRaw" class="w-full mt-1 px-3 py-2 rounded border border-input bg-background" :placeholder="$t('entities.tagsPlaceholder')" />
      </div>
    </div>

    <div>
      <label class="text-sm font-medium">{{ $t('entities.content') }}</label>
      <MarkdownEditor v-model="form.content" :placeholder="$t('entities.contentPlaceholder')" :campaign-id="campaignId" :draft-key="draftKey" class="mt-1" />
    </div>

    <div class="flex justify-end gap-2">
      <slot name="cancel" />
      <Button type="submit" :disabled="submitting">{{ submitting ? $t('common.saving') : submitLabel }}</Button>
    </div>
  </form>
</template>

<script setup lang="ts">
const props = defineProps<{
  modelValue: { name: string; type: string; visibility: string; tagsRaw: string; content: string }
  campaignId: string
  entitySlug?: string
  submitLabel?: string
  submitting?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: typeof props.modelValue]
  submit: []
}>()

const entityTypes = ref<any[]>([])

const form = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
})

const draftKey = computed(() => `aleph:draft:${props.campaignId}:entity:${props.entitySlug ?? 'new'}`)

function clearDraft() {
  try { localStorage.removeItem(draftKey.value) } catch { /* ignore */ }
}

defineExpose({ clearDraft })

onMounted(async () => {
  try { entityTypes.value = await useCampaignApi(props.campaignId).getEntityTypes() } catch { entityTypes.value = [] }
})
</script>
