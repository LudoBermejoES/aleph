<template>
  <div class="space-y-1">
    <label v-if="label" class="text-sm font-medium">{{ label }}</label>
    <select
      :value="modelValue"
      @change="$emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
      class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
    >
      <option value="public">Public</option>
      <option value="members">Members</option>
      <option value="editors">Editors+</option>
      <option value="dm_only">DM Only</option>
      <option value="private">Private (creator only)</option>
      <option value="specific_users">Specific Users</option>
    </select>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  modelValue: string
  label?: string
}>()

defineEmits<{
  'update:modelValue': [value: string]
}>()
</script>
