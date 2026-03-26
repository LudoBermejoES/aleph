<template>
  <form @submit.prevent="$emit('submit')" class="space-y-6">
    <div class="grid grid-cols-2 gap-4">
      <div class="col-span-2">
        <label class="text-sm font-medium">{{ $t('sessions.titleLabel') }}</label>
        <input v-model="form.title" class="w-full mt-1 px-3 py-2 rounded border border-input bg-background" :placeholder="$t('sessions.titlePlaceholder')" />
      </div>
      <div>
        <label class="text-sm font-medium">{{ $t('sessions.scheduledDate') }}</label>
        <input v-model="form.scheduledDate" type="date" class="w-full mt-1 px-3 py-2 rounded border border-input bg-background" />
      </div>
      <div>
        <label class="text-sm font-medium">{{ $t('characters.status') }}</label>
        <select v-model="form.status" class="w-full mt-1 px-3 py-2 rounded border border-input bg-background">
          <option value="planned">{{ $t('sessions.statusPlanned') }}</option>
          <option value="in_progress">{{ $t('sessions.statusInProgress') }}</option>
          <option value="completed">{{ $t('sessions.statusCompleted') }}</option>
          <option value="cancelled">{{ $t('sessions.statusCancelled') }}</option>
        </select>
      </div>
    </div>
    <div>
      <label class="text-sm font-medium">{{ $t('sessions.notes') }}</label>
      <MarkdownEditor v-model="form.content" :placeholder="$t('sessions.notesPlaceholder')" :campaign-id="campaignId" class="mt-1" />
    </div>
    <div class="flex justify-end gap-2">
      <slot name="cancel" />
      <Button type="submit" :disabled="submitting">{{ submitting ? $t('common.saving') : submitLabel }}</Button>
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
