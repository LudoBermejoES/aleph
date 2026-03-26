<template>
  <form @submit.prevent="$emit('submit')" class="space-y-6">
    <div class="grid grid-cols-2 gap-4">
      <div class="col-span-2">
        <label class="text-sm font-medium">Quest Name *</label>
        <input v-model="form.name" required class="w-full mt-1 px-3 py-2 rounded border border-input bg-background" placeholder="Defeat Strahd" />
      </div>
      <div>
        <label class="text-sm font-medium">Status</label>
        <select v-model="form.status" class="w-full mt-1 px-3 py-2 rounded border border-input bg-background">
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
          <option value="abandoned">Abandoned</option>
        </select>
      </div>
      <div>
        <label class="text-sm font-medium">Parent Quest</label>
        <select v-model="form.parentQuestId" class="w-full mt-1 px-3 py-2 rounded border border-input bg-background">
          <option value="">-- None (root quest) --</option>
          <option v-for="q in quests" :key="q.id" :value="q.id">{{ q.name }}</option>
        </select>
      </div>
      <div class="col-span-2">
        <label class="text-sm font-medium flex items-center gap-2">
          <input v-model="form.isSecret" type="checkbox" />
          Secret (DM only)
        </label>
      </div>
    </div>
    <div>
      <label class="text-sm font-medium">Description</label>
      <MarkdownEditor v-model="form.content" placeholder="Quest details... (type @ to link entities)" :campaign-id="campaignId" class="mt-1" />
    </div>
    <div class="flex justify-end gap-2">
      <slot name="cancel" />
      <Button type="submit" :disabled="submitting">{{ submitting ? 'Saving...' : submitLabel }}</Button>
    </div>
  </form>
</template>

<script setup lang="ts">
const props = defineProps<{
  modelValue: { name: string; status: string; parentQuestId: string; isSecret: boolean; content: string }
  campaignId: string
  submitLabel?: string
  submitting?: boolean
}>()

defineEmits<{ 'update:modelValue': [value: typeof props.modelValue]; submit: [] }>()

const quests = ref<any[]>([])

const form = computed({
  get: () => props.modelValue,
  set: (val) => {},
})

onMounted(async () => {
  try { quests.value = await $fetch(`/api/campaigns/${props.campaignId}/quests`) as any[] } catch { quests.value = [] }
})
</script>
