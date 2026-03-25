<template>
  <form @submit.prevent="$emit('submit')" class="space-y-6">
    <div class="grid grid-cols-2 gap-4">
      <div class="col-span-2">
        <label class="text-sm font-medium">Item Name *</label>
        <input v-model="form.name" required class="w-full mt-1 px-3 py-2 rounded border border-input bg-background" placeholder="Vorpal Sword" />
      </div>
      <div>
        <label class="text-sm font-medium">Rarity</label>
        <select v-model="form.rarity" class="w-full mt-1 px-3 py-2 rounded border border-input bg-background">
          <option value="common">Common</option>
          <option value="uncommon">Uncommon</option>
          <option value="rare">Rare</option>
          <option value="very_rare">Very Rare</option>
          <option value="legendary">Legendary</option>
        </select>
      </div>
      <div>
        <label class="text-sm font-medium">Type</label>
        <input v-model="form.type" class="w-full mt-1 px-3 py-2 rounded border border-input bg-background" placeholder="weapon, armor, potion..." />
      </div>
      <div>
        <label class="text-sm font-medium">Weight</label>
        <input v-model="form.weight" class="w-full mt-1 px-3 py-2 rounded border border-input bg-background" placeholder="3 lbs" />
      </div>
      <div>
        <label class="text-sm font-medium">Size</label>
        <input v-model="form.size" class="w-full mt-1 px-3 py-2 rounded border border-input bg-background" placeholder="medium, small..." />
      </div>
    </div>
    <div>
      <label class="text-sm font-medium">Description</label>
      <textarea v-model="form.description" rows="5" class="w-full mt-1 px-3 py-2 rounded border border-input bg-background" placeholder="Item description..." />
    </div>
    <div class="flex justify-end gap-2">
      <slot name="cancel" />
      <Button type="submit" :disabled="submitting">{{ submitting ? 'Saving...' : submitLabel }}</Button>
    </div>
  </form>
</template>

<script setup lang="ts">
const props = defineProps<{
  modelValue: { name: string; rarity: string; type: string; weight: string; size: string; description: string }
  submitLabel?: string
  submitting?: boolean
}>()

defineEmits<{ 'update:modelValue': [value: typeof props.modelValue]; submit: [] }>()

const form = computed({
  get: () => props.modelValue,
  set: (val) => {},
})
</script>
