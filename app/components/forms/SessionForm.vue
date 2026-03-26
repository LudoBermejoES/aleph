<template>
  <form @submit.prevent="$emit('submit')" class="space-y-6">
    <div class="grid grid-cols-2 gap-4">
      <div class="col-span-2">
        <label class="text-sm font-medium">Title</label>
        <input v-model="form.title" class="w-full mt-1 px-3 py-2 rounded border border-input bg-background" placeholder="Leave empty for auto-numbered title" />
      </div>
      <div>
        <label class="text-sm font-medium">Scheduled Date</label>
        <input v-model="form.scheduledDate" type="date" class="w-full mt-1 px-3 py-2 rounded border border-input bg-background" />
      </div>
      <div>
        <label class="text-sm font-medium">Status</label>
        <select v-model="form.status" class="w-full mt-1 px-3 py-2 rounded border border-input bg-background">
          <option value="planned">Planned</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>
    </div>
    <div>
      <label class="text-sm font-medium">Session Notes</label>
      <MarkdownEditor v-model="form.content" placeholder="Write session notes... (type @ to link entities)" :campaign-id="campaignId" class="mt-1" />
    </div>
    <div class="flex justify-end gap-2">
      <slot name="cancel" />
      <Button type="submit" :disabled="submitting">{{ submitting ? 'Saving...' : submitLabel }}</Button>
    </div>
  </form>
</template>

<script setup lang="ts">
const props = defineProps<{
  modelValue: { title: string; scheduledDate: string; status: string; content: string }
  campaignId?: string
  submitLabel?: string
  submitting?: boolean
}>()

defineEmits<{ 'update:modelValue': [value: typeof props.modelValue]; submit: [] }>()

const form = computed({
  get: () => props.modelValue,
  set: (val) => {},
})
</script>
