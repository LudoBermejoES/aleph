<template>
  <div v-if="isDm" class="mt-8 border-t border-border pt-6">
    <button
      type="button"
      class="flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors mb-3"
      @click="open = !open"
    >
      <span>{{ $t('secrets.secretNotes') }}</span>
      <span class="text-xs">{{ open ? '▲' : '▼' }}</span>
    </button>

    <div v-if="open" class="space-y-3">
      <textarea
        v-model="localContent"
        class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[120px] resize-y"
        :placeholder="$t('secrets.secretNotesPlaceholder')"
      />
      <div class="flex items-center gap-3">
        <Button size="sm" :disabled="saving" @click="save">
          {{ saving ? '...' : $t('secrets.saveNotes') }}
        </Button>
        <span v-if="saved" class="text-xs text-green-600 dark:text-green-400">{{ $t('secrets.notesSaved') }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  campaignId: string
  entitySlug: string
  campaignRole: string
}>()

const isDm = computed(() => ['dm', 'co_dm'].includes(props.campaignRole))
const open = ref(false)
const localContent = ref('')
const saving = ref(false)
const saved = ref(false)

async function load() {
  if (!isDm.value) return
  try {
    const res = await fetch(
      `/api/campaigns/${props.campaignId}/entities/${props.entitySlug}/secret-notes`,
      { credentials: 'include' },
    )
    if (res.ok) {
      const data = await res.json()
      localContent.value = data.content ?? ''
    }
  } catch { /* silently ignore */ }
}

async function save() {
  saving.value = true
  saved.value = false
  try {
    await fetch(
      `/api/campaigns/${props.campaignId}/entities/${props.entitySlug}/secret-notes`,
      {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: localContent.value }),
      },
    )
    saved.value = true
    setTimeout(() => { saved.value = false }, 3000)
  } catch { /* silently ignore */ } finally {
    saving.value = false
  }
}

watch(open, (isOpen) => {
  if (isOpen && !localContent.value) load()
})

watch(() => props.entitySlug, () => {
  localContent.value = ''
  saved.value = false
})
</script>
