<template>
  <div class="mb-6" data-testid="character-notes">
    <h2 class="text-lg font-semibold mb-1">{{ $t('characterNotes.title') }}</h2>
    <p class="text-sm text-muted-foreground mb-3">{{ $t('characterNotes.description') }}</p>

    <!-- Empty state: an invitation to add one, not a blank panel -->
    <p v-if="!notes.length" class="text-sm text-muted-foreground mb-3" data-testid="notes-empty">
      {{ canAnnotate ? $t('characterNotes.emptyInvite') : $t('characterNotes.empty') }}
    </p>

    <div v-else class="space-y-3 mb-3">
      <div
        v-for="note in notes"
        :key="note.id"
        :class="[
          'p-3 rounded border',
          note.authorUserId === myUserId ? 'border-primary/60 bg-primary/5' : 'border-border',
        ]"
        :data-testid="note.authorUserId === myUserId ? 'character-note-mine' : 'character-note'"
      >
        <div class="flex items-center gap-2 mb-1 text-xs text-muted-foreground">
          <span class="font-medium text-foreground" data-testid="note-author">{{
            note.authorName || note.authorUserId
          }}</span>
          <span v-if="note.authorUserId === myUserId" class="text-primary">{{
            $t('characterNotes.you')
          }}</span>
          <span>·</span>
          <span data-testid="note-updated">{{ formatDate(note.updatedAt) }}</span>
        </div>
        <div class="prose dark:prose-invert max-w-none text-foreground text-sm">
          <MDC :value="note.body" />
        </div>
      </div>
    </div>

    <!-- Own-note editor. Absent entirely for a visitor: they may read, never write. -->
    <div v-if="canAnnotate" class="space-y-2" data-testid="character-note-editor">
      <textarea
        v-model="draft"
        data-testid="note-body-input"
        class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[120px] resize-y"
        :placeholder="$t('characterNotes.placeholder')"
      ></textarea>
      <div class="flex items-center gap-3">
        <Button size="sm" :disabled="saving" data-testid="save-note" @click="save">
          {{ saving ? '…' : $t('characterNotes.save') }}
        </Button>
        <span
          v-if="saved"
          class="text-xs text-green-600 dark:text-green-400"
          data-testid="note-saved"
          >{{ $t('characterNotes.saved') }}</span
        >
        <span v-if="errorMessage" class="text-xs text-destructive" data-testid="note-error">{{
          errorMessage
        }}</span>
      </div>
      <p class="text-xs text-muted-foreground">{{ $t('characterNotes.emptyDeletes') }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CharacterNote } from '~/types/api'

/**
 * Public notes on a character: one per author, every member's note visible to every member
 * who can read the character.
 *
 * The caller edits only their own note — there is no control here that addresses another
 * member's row, mirroring the `/notes/me` route shape. `canAnnotate` false (a `visitor`)
 * renders no editor at all rather than a disabled one.
 */
const props = defineProps<{
  campaignId: string
  characterSlug: string
  notes: CharacterNote[]
  canAnnotate: boolean
  myUserId: string | null
}>()

const emit = defineEmits<{ saved: [] }>()

const { t } = useI18n()
const api = useCampaignApi(props.campaignId)

const draft = ref('')
const saving = ref(false)
const saved = ref(false)
const errorMessage = ref('')

function formatDate(d: string | number | Date) {
  const date = new Date(d)
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString()
}

/** Seed the editor from whichever note in the payload belongs to the caller. */
function seedDraft() {
  if (!props.myUserId) return
  draft.value = props.notes.find((n) => n.authorUserId === props.myUserId)?.body ?? ''
}

watch(() => [props.notes, props.myUserId], seedDraft, { immediate: true, deep: true })

async function save() {
  saving.value = true
  saved.value = false
  errorMessage.value = ''
  try {
    await api.saveMyCharacterNote(props.characterSlug, draft.value)
    saved.value = true
    setTimeout(() => {
      saved.value = false
    }, 3000)
    emit('saved')
  } catch (e: unknown) {
    // A refusal must be visible, never swallowed into a false success
    errorMessage.value =
      (e as { data?: { message?: string } })?.data?.message || t('characterNotes.failedSave')
  } finally {
    saving.value = false
  }
}
</script>
