<template>
  <form @submit.prevent="$emit('submit')" class="space-y-6">
    <div class="grid grid-cols-2 gap-4">
      <div class="col-span-2">
        <label class="text-sm font-medium">Name *</label>
        <input v-model="form.name" required class="w-full mt-1 px-3 py-2 rounded border border-input bg-background" placeholder="Entity name" />
      </div>
      <div>
        <label class="text-sm font-medium">Type *</label>
        <select v-model="form.type" required class="w-full mt-1 px-3 py-2 rounded border border-input bg-background">
          <option v-for="t in entityTypes" :key="t.slug" :value="t.slug">{{ t.name }}</option>
          <option value="note">Note</option>
        </select>
      </div>
      <div>
        <label class="text-sm font-medium">Visibility</label>
        <select v-model="form.visibility" class="w-full mt-1 px-3 py-2 rounded border border-input bg-background">
          <option value="members">Members</option>
          <option value="public">Public</option>
          <option value="editors">Editors</option>
          <option value="dm_only">DM Only</option>
          <option value="private">Private</option>
        </select>
      </div>
      <div class="col-span-2">
        <label class="text-sm font-medium">Tags (comma-separated)</label>
        <input v-model="form.tagsRaw" class="w-full mt-1 px-3 py-2 rounded border border-input bg-background" placeholder="npc, barovia, undead" />
      </div>
    </div>

    <div>
      <label class="text-sm font-medium">Content</label>
      <MarkdownEditor v-model="form.content" placeholder="Write entity content... (type @ to link entities)" :campaign-id="campaignId" class="mt-1" />
    </div>

    <div class="flex justify-end gap-2">
      <slot name="cancel" />
      <Button type="submit" :disabled="submitting">{{ submitting ? 'Saving...' : submitLabel }}</Button>
    </div>
  </form>
</template>

<script setup lang="ts">
const props = defineProps<{
  modelValue: { name: string; type: string; visibility: string; tagsRaw: string; content: string }
  campaignId: string
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

onMounted(async () => {
  try { entityTypes.value = await useCampaignApi(props.campaignId).getEntityTypes() } catch { entityTypes.value = [] }
})
</script>
