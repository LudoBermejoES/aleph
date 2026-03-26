<template>
  <div class="space-y-2">
    <label class="text-sm font-medium">Theme</label>
    <div class="relative">
      <select
        :value="modelValue"
        @change="$emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
        class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm appearance-none pr-8"
      >
        <option v-for="theme in CAMPAIGN_THEMES" :key="theme.id" :value="theme.id">
          {{ theme.name }}
        </option>
      </select>
      <div class="pointer-events-none absolute inset-y-0 right-2 flex items-center">
        <svg class="h-4 w-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
    <!-- Color swatch preview -->
    <div class="flex items-center gap-2 mt-1">
      <div class="flex gap-1">
        <span
          class="inline-block w-4 h-4 rounded-full border border-border"
          :style="{ background: selectedTheme?.colors.background }"
          title="Background"
        />
        <span
          class="inline-block w-4 h-4 rounded-full border border-border"
          :style="{ background: selectedTheme?.colors.primary }"
          title="Primary"
        />
        <span
          class="inline-block w-4 h-4 rounded-full border border-border"
          :style="{ background: selectedTheme?.colors.accent }"
          title="Accent"
        />
      </div>
      <span class="text-xs text-muted-foreground">{{ selectedTheme?.name }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { CAMPAIGN_THEMES } from '~/utils/themes'

const props = defineProps<{
  modelValue: string
}>()

defineEmits<{
  'update:modelValue': [value: string]
}>()

const selectedTheme = computed(() =>
  CAMPAIGN_THEMES.find(t => t.id === props.modelValue) ?? CAMPAIGN_THEMES[0]
)
</script>
