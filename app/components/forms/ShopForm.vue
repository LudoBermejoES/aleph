<template>
  <form @submit.prevent="$emit('submit')" class="space-y-6">
    <div>
      <label class="text-sm font-medium">Shop Name *</label>
      <input v-model="form.name" required class="w-full mt-1 px-3 py-2 rounded border border-input bg-background" placeholder="Ye Olde Potion Shoppe" />
    </div>
    <div>
      <label class="text-sm font-medium">Description</label>
      <textarea v-model="form.description" rows="4" class="w-full mt-1 px-3 py-2 rounded border border-input bg-background" placeholder="Shop description..." />
    </div>
    <div class="flex justify-end gap-2">
      <slot name="cancel" />
      <Button type="submit" :disabled="submitting">{{ submitting ? 'Saving...' : submitLabel }}</Button>
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
  set: (val) => {},
})
</script>
