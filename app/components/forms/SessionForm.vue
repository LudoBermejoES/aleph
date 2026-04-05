<template>
  <form @submit.prevent="$emit('submit')" class="space-y-6">
    <div class="grid grid-cols-2 gap-4">
      <div class="col-span-2">
        <label class="text-sm font-medium">{{ $t('sessions.titleLabel') }}</label>
        <input v-model="form.title" class="w-full mt-1 px-3 py-2 rounded border border-input bg-background" :placeholder="$t('sessions.titlePlaceholder')" />
      </div>
      <div>
        <label class="text-sm font-medium">{{ $t('sessions.scheduledDate') }}</label>
        <input v-model="form.scheduledDate" type="date" class="w-full mt-1 px-3 py-2 rounded border border-input bg-background" />
      </div>
      <div>
        <label class="text-sm font-medium">{{ $t('characters.status') }}</label>
        <select v-model="form.status" class="w-full mt-1 px-3 py-2 rounded border border-input bg-background">
          <option value="planned">{{ $t('sessions.statusPlanned') }}</option>
          <option value="in_progress">{{ $t('sessions.statusInProgress') }}</option>
          <option value="completed">{{ $t('sessions.statusCompleted') }}</option>
          <option value="cancelled">{{ $t('sessions.statusCancelled') }}</option>
        </select>
      </div>
      <div v-if="groups.length" class="col-span-2">
        <label class="text-sm font-medium">{{ $t('sessions.group') }}</label>
        <select v-model="form.groupSlug" class="w-full mt-1 px-3 py-2 rounded border border-input bg-background">
          <option value="">{{ $t('sessions.noGroup') }}</option>
          <option v-for="g in groups" :key="g.id" :value="g.slug">{{ g.name }}</option>
        </select>
      </div>
      <div v-if="arcs.length" class="col-span-2">
        <div class="flex items-center justify-between">
          <label class="text-sm font-medium">{{ $t('sessions.arc') }}</label>
          <NuxtLink v-if="campaignId" :to="`/campaigns/${campaignId}/arcs`" class="text-xs text-primary hover:underline">
            {{ $t('arcs.manageArcs') }}
          </NuxtLink>
        </div>
        <select v-model="form.arcId" @change="onArcChange" class="w-full mt-1 px-3 py-2 rounded border border-input bg-background">
          <option value="">{{ $t('sessions.noArc') }}</option>
          <option v-for="a in arcs" :key="a.id" :value="a.id">{{ a.name }}</option>
        </select>
      </div>
      <div v-if="form.arcId && currentArcChapters.length" class="col-span-2">
        <label class="text-sm font-medium">{{ $t('sessions.chapter') }}</label>
        <select v-model="form.chapterId" class="w-full mt-1 px-3 py-2 rounded border border-input bg-background">
          <option value="">{{ $t('sessions.noChapter') }}</option>
          <option v-for="c in currentArcChapters" :key="c.id" :value="c.id">{{ c.name }}</option>
        </select>
      </div>
    </div>
    <div>
      <label class="text-sm font-medium">{{ $t('sessions.notes') }}</label>
      <MarkdownEditor v-model="form.content" :placeholder="$t('sessions.notesPlaceholder')" :campaign-id="campaignId" :draft-key="draftKey" :collaborative="collaborative" :document-name="documentName" :user-name="userName" :user-color="userColor" class="mt-1" />
    </div>
    <div class="flex justify-end gap-2">
      <slot name="cancel" />
      <Button type="submit" :disabled="submitting">{{ submitting ? $t('common.saving') : submitLabel }}</Button>
    </div>
    <ErrorToast v-if="loadError" :message="loadError" @dismiss="loadError = null" />
  </form>
</template>

<script setup lang="ts">
const props = defineProps<{
  modelValue: { title: string; scheduledDate: string; status: string; content: string; groupSlug?: string; arcId?: string; chapterId?: string }
  campaignId?: string
  sessionSlug?: string
  submitLabel?: string
  submitting?: boolean
  collaborative?: boolean
  documentName?: string
  userName?: string
  userColor?: string
}>()

defineEmits<{ 'update:modelValue': [value: typeof props.modelValue]; submit: [] }>()

const form = computed({
  get: () => props.modelValue,
  set: (val) => {},
})

const draftKey = computed(() =>
  props.campaignId ? `aleph:draft:${props.campaignId}:session:${props.sessionSlug ?? 'new'}` : null,
)

const groups = ref<any[]>([])
const arcs = ref<any[]>([])
const loadError = ref<string | null>(null)

const currentArcChapters = computed(() => {
  if (!form.value.arcId) return []
  return arcs.value.find(a => a.id === form.value.arcId)?.chapters ?? []
})

function onArcChange() {
  form.value.chapterId = ''
}

onMounted(async () => {
  if (props.campaignId) {
    try {
      const [groupsData, arcsData] = await Promise.all([
        $fetch<any[]>(`/api/campaigns/${props.campaignId}/session-groups`),
        $fetch<any[]>(`/api/campaigns/${props.campaignId}/arcs`),
      ])
      groups.value = groupsData
      arcs.value = arcsData
    } catch (e: any) {
      loadError.value = e.data?.message || e.message || 'Failed to load form data'
    }
  }
})

function clearDraft() {
  if (!draftKey.value) return
  try { localStorage.removeItem(draftKey.value) } catch { /* ignore */ }
}

defineExpose({ clearDraft })
</script>
