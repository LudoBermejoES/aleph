<template>
  <!-- The whole panel is DM/co_dm only: below that role there is no input, no picker and no
       heading at all (spec: "players do not see the editing affordance"). -->
  <div
    v-if="canManage"
    class="mb-6 p-4 rounded-lg border border-border"
    data-testid="session-xp-panel"
  >
    <div class="flex items-center justify-between mb-3">
      <h2 class="text-sm font-semibold">{{ $t('sessions.xpAwards') }}</h2>
      <button
        class="text-xs px-2 py-1 rounded border border-border hover:border-primary/50 transition-colors"
        data-testid="session-xp-add-toggle"
        @click="togglePicker"
      >
        + {{ $t('sessions.xpAddCharacter') }}
      </button>
    </div>

    <!-- Character picker: any character of the campaign, not just the session's roster. A
         character can earn XP for downtime or off-screen action without an attendance row
         (design decision 4), so this list is deliberately not gated on attendance. -->
    <div v-if="showPicker" class="mb-3 p-2 rounded border border-border bg-muted/20">
      <input
        v-model="pickerSearch"
        type="search"
        class="w-full mb-2 rounded border border-input bg-background px-2 py-1 text-xs"
        :placeholder="$t('common.search')"
        :aria-label="$t('sessions.xpAddCharacter')"
        data-testid="session-xp-picker-search"
      />
      <div v-if="pickerOptions.length" class="space-y-1 max-h-48 overflow-y-auto">
        <button
          v-for="c in pickerOptions"
          :key="c.id"
          class="w-full text-left text-xs px-2 py-1 rounded hover:bg-accent transition-colors"
          data-testid="session-xp-picker-option"
          @click="addCharacter(c.id)"
        >
          {{ c.name }}
        </button>
      </div>
      <p v-else class="text-xs text-muted-foreground italic">{{ $t('common.noResults') }}</p>
    </div>

    <div v-if="rows.length" class="space-y-2">
      <div
        v-for="(row, i) in rows"
        :key="row.characterId"
        class="flex items-center gap-3"
        data-testid="session-xp-row"
      >
        <span class="text-sm flex-1">{{ characterName(row.characterId) }}</span>
        <label class="flex items-center gap-1 text-xs text-muted-foreground">
          {{ $t('sessions.xp') }}
          <input
            :value="row.xp"
            type="number"
            min="0"
            step="1"
            :placeholder="$t('sessions.xpNotRecorded')"
            :aria-label="$t('sessions.xp') + ' — ' + characterName(row.characterId)"
            :class="[
              'w-16 rounded border bg-background px-1 py-0.5 text-xs',
              isRowInvalid(row) ? 'border-destructive' : 'border-input',
            ]"
            data-testid="session-xp-input"
            @input="onXpInput(i, $event)"
          />
        </label>
        <button
          class="text-xs text-destructive hover:text-destructive/80 transition-colors ml-1"
          :title="$t('common.remove')"
          data-testid="session-xp-remove"
          @click="removeRow(i)"
        >
          ×
        </button>
      </div>
    </div>
    <p v-else class="text-xs text-muted-foreground italic" data-testid="session-xp-empty">
      {{ $t('sessions.xpNoAwards') }}
    </p>

    <div class="mt-3 pt-3 border-t border-border">
      <Button size="sm" :disabled="saving || invalid" data-testid="session-xp-save" @click="save">
        {{ saving ? $t('common.saving') : $t('common.save') }}
      </Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  buildXpRows,
  hasInvalidXp,
  parseXpInput,
  toAwardsBody,
  type SessionAttendanceRosterEntry,
  type SessionXpAward,
  type SessionXpRow,
} from '~/utils/session-xp-awards'

interface PickableCharacter {
  id: string
  name: string
}

const props = withDefaults(
  defineProps<{
    /** The session's attendance roster. Rows with no `characterId` contribute no line. */
    attendance?: SessionAttendanceRosterEntry[]
    /** What `GET .../sessions/:slug` already reports in `xpAwards`. No second call is needed. */
    xpAwards?: SessionXpAward[]
    /** Every character of the campaign — feeds both the picker and the row labels. */
    characters?: PickableCharacter[]
    canManage: boolean
    saving?: boolean
  }>(),
  { attendance: () => [], xpAwards: () => [], characters: () => [], saving: false },
)

const emit = defineEmits<{
  /**
   * The COMPLETE award list for the session. The endpoint replaces rather than merges, so this is
   * "what should exist afterwards" and never a patch — a character missing from it loses its
   * award, which is exactly how the remove button works.
   */
  save: [awards: { characterId: string; xp: number }[]]
}>()

const { t } = useI18n()

const rows = ref<SessionXpRow[]>([])
const showPicker = ref(false)
const pickerSearch = ref('')
// Once the DM has touched the panel, an unrelated refresh of the session (marking someone
// attended, an RSVP) must not wipe what they typed. Cleared when the save is handed off.
const dirty = ref(false)

/** Changes only when the SERVER's view of the roster/awards changes, not on every refetch. */
const seedSignature = computed(() => JSON.stringify(buildXpRows(props.attendance, props.xpAwards)))

watch(
  seedSignature,
  (signature) => {
    if (dirty.value) return
    rows.value = JSON.parse(signature) as SessionXpRow[]
  },
  { immediate: true },
)

const namesById = computed(() => {
  const map = new Map<string, string>()
  for (const award of props.xpAwards) {
    if (award?.characterId && award.characterName) map.set(award.characterId, award.characterName)
  }
  // The campaign character list is the better source: it also names roster characters that have
  // no award yet, and it is fresher than a stored award label.
  for (const character of props.characters) {
    if (character?.id && character.name) map.set(character.id, character.name)
  }
  return map
})

function characterName(characterId: string): string {
  return namesById.value.get(characterId) ?? t('sessions.xpUnknownCharacter')
}

const rowIds = computed(() => new Set(rows.value.map((r) => r.characterId)))

const pickerOptions = computed(() => {
  const query = pickerSearch.value.trim().toLowerCase()
  return props.characters.filter(
    (c) =>
      c?.id && !rowIds.value.has(c.id) && (!query || (c.name ?? '').toLowerCase().includes(query)),
  )
})

const invalid = computed(() => hasInvalidXp(rows.value))

function isRowInvalid(row: SessionXpRow): boolean {
  return parseXpInput(row.xp).kind === 'invalid'
}

function togglePicker() {
  showPicker.value = !showPicker.value
  if (!showPicker.value) pickerSearch.value = ''
}

function addCharacter(characterId: string) {
  if (rowIds.value.has(characterId)) return
  rows.value = [...rows.value, { characterId, xp: '' }]
  dirty.value = true
  showPicker.value = false
  pickerSearch.value = ''
}

function onXpInput(index: number, event: Event) {
  const row = rows.value[index]
  if (!row) return
  row.xp = (event.target as HTMLInputElement).value
  dirty.value = true
}

function removeRow(index: number) {
  rows.value = rows.value.filter((_, i) => i !== index)
  dirty.value = true
}

function save() {
  if (invalid.value) return
  // Hand off optimistically: the parent refetches on success, and this panel then re-seeds from
  // the server. On failure the props do not change, so what the DM typed stays on screen.
  dirty.value = false
  emit('save', toAwardsBody(rows.value))
}
</script>
