<template>
  <form @submit.prevent="$emit('submit')" class="space-y-6">
    <div class="grid grid-cols-2 gap-4">
      <div class="col-span-2">
        <label class="text-sm font-medium">{{ $t('characters.name') }}</label>
        <input v-model="form.name" required class="w-full mt-1 px-3 py-2 rounded border border-input bg-background" :placeholder="$t('characters.namePlaceholder')" />
      </div>
      <div>
        <label class="text-sm font-medium">{{ $t('characters.type') }}</label>
        <select v-model="form.characterType" class="w-full mt-1 px-3 py-2 rounded border border-input bg-background">
          <option value="npc">{{ $t('characters.npc') }}</option>
          <option value="pc">{{ $t('characters.pc') }}</option>
        </select>
      </div>
      <div>
        <label class="text-sm font-medium">{{ $t('characters.status') }}</label>
        <select v-model="form.status" class="w-full mt-1 px-3 py-2 rounded border border-input bg-background">
          <option value="alive">{{ $t('characters.alive') }}</option>
          <option value="dead">{{ $t('characters.dead') }}</option>
          <option value="missing">{{ $t('characters.missing') }}</option>
          <option value="unknown">{{ $t('characters.unknown') }}</option>
        </select>
      </div>
      <div v-if="form.characterType === 'pc'">
        <label class="text-sm font-medium">{{ $t('characters.owner') }}</label>
        <select v-model="form.ownerUserId" class="w-full mt-1 px-3 py-2 rounded border border-input bg-background">
          <option value="">{{ $t('characters.noOwner') }}</option>
          <option v-for="m in members" :key="m.userId" :value="m.userId">{{ m.name }} ({{ m.role }})</option>
        </select>
      </div>
      <div>
        <label class="text-sm font-medium">{{ $t('characters.race') }}</label>
        <input v-model="form.race" class="w-full mt-1 px-3 py-2 rounded border border-input bg-background" :placeholder="$t('characters.racePlaceholder')" />
      </div>
      <div>
        <label class="text-sm font-medium">{{ $t('characters.class') }}</label>
        <input v-model="form.class" class="w-full mt-1 px-3 py-2 rounded border border-input bg-background" :placeholder="$t('characters.classPlaceholder')" />
      </div>
      <div>
        <label class="text-sm font-medium">{{ $t('characters.alignment') }}</label>
        <input v-model="form.alignment" class="w-full mt-1 px-3 py-2 rounded border border-input bg-background" :placeholder="$t('characters.alignmentPlaceholder')" />
      </div>
      <div>
        <label class="text-sm font-medium">{{ $t('characters.visibility') }}</label>
        <select v-model="form.visibility" class="w-full mt-1 px-3 py-2 rounded border border-input bg-background">
          <option value="members">{{ $t('characters.visibilityMembers') }}</option>
          <option value="public">{{ $t('characters.visibilityPublic') }}</option>
          <option value="editors">{{ $t('characters.visibilityEditors') }}</option>
          <option value="dm_only">{{ $t('characters.visibilityDmOnly') }}</option>
          <option value="private">{{ $t('characters.visibilityPrivate') }}</option>
        </select>
      </div>
    </div>

    <div>
      <label class="text-sm font-medium">{{ $t('characters.description') }}</label>
      <MarkdownEditor v-model="form.content" :placeholder="$t('characters.descriptionPlaceholder')" :campaign-id="campaignId" class="mt-1" />
    </div>

    <div class="flex justify-end gap-2">
      <slot name="cancel" />
      <Button type="submit" :disabled="submitting">{{ submitting ? $t('common.saving') : submitLabel }}</Button>
    </div>
  </form>
</template>

<script setup lang="ts">
const props = defineProps<{
  modelValue: { name: string; characterType: string; race: string; class: string; alignment: string; status: string; visibility: string; content: string; ownerUserId: string }
  campaignId: string
  submitLabel?: string
  submitting?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: typeof props.modelValue]
  submit: []
}>()

const members = ref<any[]>([])

const form = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
})

onMounted(async () => {
  try { members.value = await useCampaignApi(props.campaignId).getMembers() } catch { members.value = [] }
})
</script>
