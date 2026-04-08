<template>
  <form class="space-y-6" @submit.prevent="$emit('submit')">
    <div>
      <label class="text-sm font-medium">{{ $t('shops.name') }}</label>
      <input
        v-model="form.name"
        required
        class="w-full mt-1 px-3 py-2 rounded border border-input bg-background"
        :placeholder="$t('shops.namePlaceholder')"
      />
    </div>
    <div>
      <label class="text-sm font-medium">{{ $t('items.description') }}</label>
      <textarea
        v-model="form.description"
        rows="4"
        class="w-full mt-1 px-3 py-2 rounded border border-input bg-background"
        placeholder="Shop description..."
      ></textarea>
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
  modelValue: { name: string; description: string }
  submitLabel?: string
  submitting?: boolean
}>()

defineEmits<{ 'update:modelValue': [value: typeof props.modelValue]; submit: [] }>()

const form = computed({
  get: () => props.modelValue,
  set: (_val) => {},
})
</script>
