<template>
  <form @submit.prevent="$emit('submit')" class="space-y-6">
    <div class="grid grid-cols-2 gap-4">
      <div class="col-span-2">
        <label class="text-sm font-medium">{{ $t('items.name') }}</label>
        <input v-model="form.name" required class="w-full mt-1 px-3 py-2 rounded border border-input bg-background" :placeholder="$t('items.namePlaceholder')" />
      </div>
      <div>
        <label class="text-sm font-medium">{{ $t('items.rarity') }}</label>
        <select v-model="form.rarity" class="w-full mt-1 px-3 py-2 rounded border border-input bg-background">
          <option value="common">{{ $t('items.rarityCommon') }}</option>
          <option value="uncommon">{{ $t('items.rarityUncommon') }}</option>
          <option value="rare">{{ $t('items.rarityRare') }}</option>
          <option value="very_rare">{{ $t('items.rarityVeryRare') }}</option>
          <option value="legendary">{{ $t('items.rarityLegendary') }}</option>
        </select>
      </div>
      <div>
        <label class="text-sm font-medium">{{ $t('items.type') }}</label>
        <input v-model="form.type" class="w-full mt-1 px-3 py-2 rounded border border-input bg-background" :placeholder="$t('items.typePlaceholder')" />
      </div>
      <div>
        <label class="text-sm font-medium">{{ $t('items.weight') }}</label>
        <input v-model="form.weight" class="w-full mt-1 px-3 py-2 rounded border border-input bg-background" :placeholder="$t('items.weightPlaceholder')" />
      </div>
      <div>
        <label class="text-sm font-medium">{{ $t('items.size') }}</label>
        <input v-model="form.size" class="w-full mt-1 px-3 py-2 rounded border border-input bg-background" :placeholder="$t('items.sizePlaceholder')" />
      </div>
    </div>
    <div>
      <label class="text-sm font-medium">{{ $t('items.description') }}</label>
      <textarea v-model="form.description" rows="5" class="w-full mt-1 px-3 py-2 rounded border border-input bg-background" :placeholder="$t('items.descriptionPlaceholder')" />
    </div>
    <div class="flex justify-end gap-2">
      <slot name="cancel" />
      <Button type="submit" :disabled="submitting">{{ submitting ? $t('common.saving') : submitLabel }}</Button>
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
