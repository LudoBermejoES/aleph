<template>
  <form @submit.prevent="$emit('submit')" class="space-y-6">
    <div>
      <label class="text-sm font-medium">Map Name *</label>
      <input v-model="form.name" required class="w-full mt-1 px-3 py-2 rounded border border-input bg-background" placeholder="Barovia Regional Map" />
    </div>
    <div>
      <label class="text-sm font-medium">Visibility</label>
      <select v-model="form.visibility" class="w-full mt-1 px-3 py-2 rounded border border-input bg-background">
        <option value="members">Members</option>
        <option value="public">Public</option>
        <option value="dm_only">DM Only</option>
      </select>
    </div>
    <div>
      <label class="text-sm font-medium">Map Image (optional)</label>
      <input ref="fileInput" type="file" accept="image/png,image/jpeg,image/webp" class="block w-full mt-1 text-sm border border-input rounded-md p-2 bg-background" />
      <p class="text-xs text-muted-foreground mt-1">PNG, JPEG, or WebP. Max 100MB.</p>
    </div>
    <div class="flex justify-end gap-2">
      <slot name="cancel" />
      <Button type="submit" :disabled="submitting">{{ submitting ? 'Saving...' : submitLabel }}</Button>
    </div>
  </form>
</template>

<script setup lang="ts">
const props = defineProps<{
  modelValue: { name: string; visibility: string }
  submitLabel?: string
  submitting?: boolean
}>()

defineEmits<{ 'update:modelValue': [value: typeof props.modelValue]; submit: [] }>()

const fileInput = ref<HTMLInputElement>()

const form = computed({
  get: () => props.modelValue,
  set: (val) => {},
})

defineExpose({ fileInput })
</script>
