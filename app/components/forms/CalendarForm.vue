<template>
  <form @submit.prevent="$emit('submit')" class="space-y-6">
    <div>
      <label class="text-sm font-medium">{{ $t('calendars.name') }}</label>
      <input v-model="form.name" required class="w-full mt-1 px-3 py-2 rounded border border-input bg-background" :placeholder="$t('calendars.namePlaceholder')" />
    </div>
    <div class="grid grid-cols-3 gap-4">
      <div>
        <label class="text-sm font-medium">{{ $t('calendars.currentYear') }}</label>
        <input v-model.number="form.currentYear" type="number" class="w-full mt-1 px-3 py-2 rounded border border-input bg-background" />
      </div>
      <div>
        <label class="text-sm font-medium">Month</label>
        <input v-model.number="form.currentMonth" type="number" min="1" class="w-full mt-1 px-3 py-2 rounded border border-input bg-background" />
      </div>
      <div>
        <label class="text-sm font-medium">Day</label>
        <input v-model.number="form.currentDay" type="number" min="1" class="w-full mt-1 px-3 py-2 rounded border border-input bg-background" />
      </div>
    </div>
    <div>
      <div class="flex items-center justify-between mb-2">
        <label class="text-sm font-medium">{{ $t('calendars.months') }}</label>
        <Button type="button" variant="outline" size="sm" @click="form.months.push({ name: '', days: 30 })">{{ $t('calendars.addMonth') }}</Button>
      </div>
      <div v-for="(m, i) in form.months" :key="i" class="flex gap-2 mb-2">
        <input v-model="m.name" :placeholder="$t('calendars.monthNamePlaceholder')" class="flex-1 px-3 py-2 rounded border border-input bg-background" />
        <input v-model.number="m.days" type="number" min="1" :placeholder="$t('calendars.daysLabel')" class="w-24 px-3 py-2 rounded border border-input bg-background" />
        <Button type="button" variant="ghost" size="sm" @click="form.months.splice(i, 1)" class="text-red-500">Remove</Button>
      </div>
      <p v-if="!form.months.length" class="text-sm text-muted-foreground">{{ $t('calendars.noMonths') }}</p>
    </div>
    <div>
      <label class="text-sm font-medium">{{ $t('calendars.weekdays') }}</label>
      <input v-model="form.weekdaysRaw" class="w-full mt-1 px-3 py-2 rounded border border-input bg-background" :placeholder="$t('calendars.weekdaysPlaceholder')" />
      <p class="text-xs text-muted-foreground mt-1">{{ $t('calendars.weekdaysHint') }}</p>
    </div>
    <div class="flex justify-end gap-2">
      <slot name="cancel" />
      <Button type="submit" :disabled="submitting">{{ submitting ? $t('common.saving') : submitLabel }}</Button>
    </div>
  </form>
</template>

<script setup lang="ts">
const props = defineProps<{
  modelValue: { name: string; currentYear: number; currentMonth: number; currentDay: number; months: Array<{ name: string; days: number }>; weekdaysRaw: string }
  submitLabel?: string
  submitting?: boolean
}>()

defineEmits<{ 'update:modelValue': [value: typeof props.modelValue]; submit: [] }>()

const form = computed({
  get: () => props.modelValue,
  set: (val) => { /* parent handles via v-model */ },
})
</script>
