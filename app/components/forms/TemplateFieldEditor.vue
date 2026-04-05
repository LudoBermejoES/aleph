<template>
  <div class="space-y-3">
    <!-- Existing fields -->
    <div
      v-for="(field, index) in fields"
      :key="field._key"
      class="p-3 rounded border border-border space-y-2"
    >
      <div class="grid grid-cols-2 gap-2">
        <div>
          <label class="text-xs font-medium text-muted-foreground">{{
            $t('templates.fieldKey')
          }}</label>
          <input
            v-model="field.key"
            type="text"
            class="w-full mt-0.5 px-2 py-1 rounded border border-input bg-background text-sm"
          />
        </div>
        <div>
          <label class="text-xs font-medium text-muted-foreground">{{
            $t('templates.fieldLabel')
          }}</label>
          <input
            v-model="field.label"
            type="text"
            class="w-full mt-0.5 px-2 py-1 rounded border border-input bg-background text-sm"
          />
        </div>
        <div>
          <label class="text-xs font-medium text-muted-foreground">{{
            $t('templates.fieldType')
          }}</label>
          <select
            v-model="field.fieldType"
            class="w-full mt-0.5 px-2 py-1 rounded border border-input bg-background text-sm"
          >
            <option value="text">text</option>
            <option value="textarea">textarea</option>
            <option value="number">number</option>
            <option value="select">select</option>
            <option value="checkbox">checkbox</option>
          </select>
        </div>
        <div class="flex items-end gap-2">
          <label class="flex items-center gap-1 text-sm cursor-pointer">
            <input v-model="field.required" type="checkbox" class="rounded" />
            {{ $t('templates.fieldRequired') }}
          </label>
        </div>
      </div>
      <div v-if="field.fieldType === 'select'">
        <label class="text-xs font-medium text-muted-foreground">{{
          $t('templates.fieldOptions')
        }}</label>
        <input
          v-model="field.optionsRaw"
          type="text"
          :placeholder="$t('templates.fieldOptionsPlaceholder')"
          class="w-full mt-0.5 px-2 py-1 rounded border border-input bg-background text-sm"
        />
      </div>
      <div class="flex justify-between items-center">
        <div class="flex gap-1">
          <button
            type="button"
            :disabled="index === 0"
            class="p-1 rounded hover:bg-accent disabled:opacity-30 text-xs"
            @click="moveField(index, -1)"
          >
            ↑
          </button>
          <button
            type="button"
            :disabled="index === fields.length - 1"
            class="p-1 rounded hover:bg-accent disabled:opacity-30 text-xs"
            @click="moveField(index, 1)"
          >
            ↓
          </button>
        </div>
        <button
          type="button"
          class="text-xs text-destructive hover:underline"
          @click="removeField(index)"
        >
          {{ $t('common.remove') }}
        </button>
      </div>
    </div>

    <!-- Add field button -->
    <button
      type="button"
      class="w-full p-2 rounded border border-dashed border-border text-sm text-muted-foreground hover:text-foreground hover:border-border/80 transition-colors"
      @click="addField"
    >
      + {{ $t('templates.addField') }}
    </button>
  </div>
</template>

<script setup lang="ts">
interface TemplateField {
  _key: string
  key: string
  label: string
  fieldType: string
  required: boolean
  optionsRaw: string
}

const props = defineProps<{
  modelValue: TemplateField[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: TemplateField[]]
}>()

const fields = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
})

let counter = 0

function addField() {
  fields.value = [
    ...fields.value,
    {
      _key: `new-${++counter}`,
      key: '',
      label: '',
      fieldType: 'text',
      required: false,
      optionsRaw: '',
    },
  ]
}

function removeField(index: number) {
  const updated = [...fields.value]
  updated.splice(index, 1)
  fields.value = updated
}

function moveField(index: number, direction: number) {
  const updated = [...fields.value]
  const swap = index + direction
  if (swap < 0 || swap >= updated.length) return
  ;[updated[index], updated[swap]] = [updated[swap], updated[index]]
  fields.value = updated
}
</script>
