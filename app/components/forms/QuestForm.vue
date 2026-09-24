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
        <!-- Generated from the shared vocabulary, never typed out. A hard-coded list here was a
             THIRD declaration of the statuses, and it is the one that shipped a visible, enabled
             option (`abandoned`) that the server rejected for months. -->
        <select
          v-model="form.status"
          class="w-full mt-1 px-3 py-2 rounded border border-input bg-background"
        >
          <option v-for="s in QUEST_STATUSES" :key="s" :value="s">{{ questStatusLabel(s) }}</option>
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
      <!-- Without this the web could only create quests in the default sub-campaign, and moving
           one afterwards needed the CLI. Hidden when the campaign has only its default. -->
      <div v-if="subCampaigns.length > 1">
        <label class="text-sm font-medium">{{ $t('sessions.subCampaign') }}</label>
        <select
          v-model="form.subCampaignSlug"
          class="w-full mt-1 px-3 py-2 rounded border border-input bg-background"
        >
          <option v-for="sc in subCampaigns" :key="sc.id" :value="sc.slug">{{ sc.name }}</option>
        </select>
      </div>
      <div class="col-span-2">
        <label class="text-sm font-medium flex items-center gap-2">
          <input v-model="form.isSecret" type="checkbox" />
          {{ $t('quests.secret') }}
        </label>
      </div>
    </div>
    <!-- The standfirst. It sits ABOVE the long description because that is the reading order on
         the list and on the detail page, and because a writer who meets the long editor first
         tends to pour everything into it and leave this empty. Plain <input>, not MarkdownEditor:
         the list renders this verbatim, so there is deliberately no syntax to write here. -->
    <div>
      <label class="text-sm font-medium" for="quest-short-description">{{
        $t('quests.shortDescription')
      }}</label>
      <input
        id="quest-short-description"
        v-model="form.shortDescription"
        type="text"
        :maxlength="QUEST_SHORT_DESCRIPTION_MAX_LENGTH"
        class="w-full mt-1 px-3 py-2 rounded border border-input bg-background"
        :placeholder="$t('quests.shortDescriptionPlaceholder')"
      />
      <p class="mt-1 flex justify-between gap-4 text-xs text-muted-foreground">
        <span>{{ $t('quests.shortDescriptionHelp') }}</span>
        <!-- A courtesy, not the guarantee: the server is what enforces the cap (design D3). -->
        <span :class="shortDescriptionAtLimit ? 'text-destructive font-medium' : ''"
          >{{ shortDescriptionLength }}/{{ QUEST_SHORT_DESCRIPTION_MAX_LENGTH }}</span
        >
      </p>
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
import { QUEST_SHORT_DESCRIPTION_MAX_LENGTH } from '#shared/utils/quest-short-description'
import { QUEST_STATUSES } from '#shared/utils/quest-status'

const props = defineProps<{
  modelValue: {
    name: string
    status: string
    parentQuestId: string
    isSecret: boolean
    content: string
    shortDescription: string
    subCampaignSlug?: string
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

const emit = defineEmits<{
  'update:modelValue': [value: typeof props.modelValue]
  submit: []
}>()

const { t } = useI18n()
const quests = ref<Quest[]>([])
interface SubCampaignRow {
  id: string
  slug: string
  name: string
  isDefault: boolean
}
const subCampaigns = ref<SubCampaignRow[]>([])

const form = computed({
  get: () => props.modelValue,
  set: (_val) => {},
})

// Same helper shape the quest detail page uses: `quests.status<Capitalised>`, falling back to the
// raw value so a missing translation renders the status rather than an empty option.
function questStatusLabel(status: string): string {
  return t(`quests.status${status.charAt(0).toUpperCase()}${status.slice(1)}`, status)
}

const shortDescriptionLength = computed(() => (props.modelValue.shortDescription || '').length)
const shortDescriptionAtLimit = computed(
  () => shortDescriptionLength.value >= QUEST_SHORT_DESCRIPTION_MAX_LENGTH,
)

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
  try {
    const subs = await $fetch<SubCampaignRow[]>(`/api/campaigns/${props.campaignId}/sub-campaigns`)
    subCampaigns.value = subs
    // Pre-selected to the campaign default on create, as SessionForm does, so a quest never
    // lands somewhere the author did not see.
    if (!props.modelValue.subCampaignSlug) {
      const fallback = subs.find((sc) => sc.isDefault)?.slug ?? subs[0]?.slug
      // Emitted, not mutated in place: the prop object is the parent's and writing through it
      // works by accident of reference sharing, which is what `vue/no-mutating-props` is for.
      if (fallback) emit('update:modelValue', { ...props.modelValue, subCampaignSlug: fallback })
    }
  } catch {
    subCampaigns.value = []
  }
})
</script>
