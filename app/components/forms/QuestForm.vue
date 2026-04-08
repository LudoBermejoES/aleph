<template>
  <form class="space-y-6" @submit.prevent="$emit('submit')">
    <div class="grid grid-cols-2 gap-4">
      <div class="col-span-2">
        <label class="text-sm font-medium">{{ $t('quests.name') }}</label>
        <input
          v-model="form.name"
          required
          class="w-full mt-1 px-3 py-2 rounded border border-input bg-background"
          :placeholder="$t('quests.namePlaceholder')"
        />
      </div>
      <div>
        <label class="text-sm font-medium">{{ $t('characters.status') }}</label>
        <select
          v-model="form.status"
          class="w-full mt-1 px-3 py-2 rounded border border-input bg-background"
        >
          <option value="active">{{ $t('sessions.statusActive') }}</option>
          <option value="completed">{{ $t('quests.statusCompleted') }}</option>
          <option value="failed">{{ $t('quests.statusFailed') }}</option>
          <option value="abandoned">{{ $t('quests.statusAbandoned') }}</option>
        </select>
      </div>
      <div>
        <label class="text-sm font-medium">{{ $t('quests.parentQuest') }}</label>
        <select
          v-model="form.parentQuestId"
          class="w-full mt-1 px-3 py-2 rounded border border-input bg-background"
        >
          <option value="">{{ $t('quests.noParent') }}</option>
          <option v-for="q in quests" :key="q.id" :value="q.id">{{ q.name }}</option>
        </select>
      </div>
      <div class="col-span-2">
        <label class="text-sm font-medium flex items-center gap-2">
          <input v-model="form.isSecret" type="checkbox" />
          {{ $t('quests.secret') }}
        </label>
      </div>
    </div>
    <div>
      <label class="text-sm font-medium">{{ $t('quests.description') }}</label>
      <MarkdownEditor
        v-model="form.content"
        :placeholder="$t('quests.descriptionPlaceholder')"
        :campaign-id="campaignId"
        :draft-key="draftKey"
        :collaborative="collaborative"
        :document-name="documentName"
        :user-name="userName"
        :user-color="userColor"
        class="mt-1"
      />
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
import type { Quest } from '~/types/api'

const props = defineProps<{
  modelValue: {
    name: string
    status: string
    parentQuestId: string
    isSecret: boolean
    content: string
  }
  campaignId: string
  questSlug?: string
  submitLabel?: string
  submitting?: boolean
  collaborative?: boolean
  documentName?: string
  userName?: string
  userColor?: string
}>()

defineEmits<{ 'update:modelValue': [value: typeof props.modelValue]; submit: [] }>()

const quests = ref<Quest[]>([])

const form = computed({
  get: () => props.modelValue,
  set: (_val) => {},
})

const draftKey = computed(() => `aleph:draft:${props.campaignId}:quest:${props.questSlug ?? 'new'}`)

function clearDraft() {
  try {
    localStorage.removeItem(draftKey.value)
  } catch {
    /* ignore */
  }
}

defineExpose({ clearDraft })

onMounted(async () => {
  try {
    quests.value = await useCampaignApi(props.campaignId).getQuests()
  } catch {
    quests.value = []
  }
})
</script>
