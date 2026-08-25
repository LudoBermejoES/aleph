<template>
  <div class="mb-6 p-4 rounded-lg border border-border">
    <div class="flex items-center justify-between mb-3">
      <h2 class="text-sm font-semibold">{{ $t('sessions.attendance') }}</h2>
      <button
        v-if="canManage"
        class="text-xs px-2 py-1 rounded border border-border hover:border-primary/50 transition-colors"
        @click="showPicker = !showPicker"
      >
        + {{ $t('sessions.addParticipant') }}
      </button>
    </div>

    <!-- Member picker -->
    <div v-if="canManage && showPicker" class="mb-3 p-2 rounded border border-border bg-muted/20">
      <p class="text-xs text-muted-foreground mb-1">{{ $t('sessions.selectMember') }}</p>
      <div v-if="eligibleMembers.length" class="space-y-1">
        <button
          v-for="m in eligibleMembers"
          :key="m.userId"
          class="w-full text-left text-xs px-2 py-1 rounded hover:bg-accent transition-colors"
          @click="addParticipant(m.userId)"
        >
          {{ m.name }}
        </button>
      </div>
      <p v-else class="text-xs text-muted-foreground italic">
        {{ $t('sessions.noEligibleMembers') }}
      </p>
    </div>

    <div v-if="attendance.length" class="space-y-2">
      <div v-for="a in attendance" :key="a.id" class="flex items-center gap-3">
        <span
          :class="[
            'w-2 h-2 rounded-full flex-shrink-0',
            a.rsvpStatus === 'accepted'
              ? 'bg-green-500'
              : a.rsvpStatus === 'declined'
                ? 'bg-red-500'
                : 'bg-yellow-500',
          ]"
        ></span>
        <span class="text-sm flex-1">{{ a.userName }}</span>
        <span v-if="a.characterId" class="text-xs text-muted-foreground">{{ a.characterId }}</span>
        <label
          v-if="canManage"
          class="flex items-center gap-1 text-xs text-muted-foreground cursor-pointer"
        >
          <input
            type="checkbox"
            :checked="a.attended"
            class="rounded"
            @change="$emit('set-attended', a.userId, ($event.target as HTMLInputElement).checked)"
          />
          {{ $t('sessions.attended') }}
        </label>
        <!-- XP can only be recorded once attendance is marked — the server enforces the same
             rule, this just avoids offering a control that would come back a 422. -->
        <label
          v-if="canManage && a.attended"
          class="flex items-center gap-1 text-xs text-muted-foreground"
        >
          {{ $t('sessions.xp') }}
          <input
            type="number"
            min="0"
            step="1"
            :value="a.xp ?? ''"
            :placeholder="$t('sessions.xpNotRecorded')"
            :aria-label="$t('sessions.xp') + ' — ' + a.userName"
            class="w-14 rounded border border-input bg-background px-1 py-0.5 text-xs"
            @change="onXpChange(a, $event)"
          />
        </label>
        <span v-else-if="canManage" class="text-xs text-muted-foreground/60 italic">{{
          $t('sessions.xpRequiresAttendance')
        }}</span>
        <span v-else-if="a.xp !== null && a.xp !== undefined" class="text-xs text-muted-foreground">
          {{ $t('sessions.xp') }}: {{ a.xp }}
        </span>
        <button
          v-if="canManage"
          class="text-xs text-destructive hover:text-destructive/80 transition-colors ml-1"
          :title="$t('sessions.removeParticipant')"
          @click="$emit('remove-participant', a.userId)"
        >
          ×
        </button>
      </div>
    </div>
    <p v-else class="text-xs text-muted-foreground italic">{{ $t('sessions.noAttendance') }}</p>

    <div class="mt-3 pt-3 border-t border-border">
      <span class="text-xs text-muted-foreground mr-2">{{ $t('sessions.yourRsvp') }}</span>
      <div class="inline-flex gap-1 mt-1">
        <button
          v-for="status in rsvpStatuses"
          :key="status.value"
          :class="[
            'px-2 py-0.5 text-xs rounded border transition-colors',
            myRsvp === status.value
              ? 'bg-primary text-primary-foreground border-primary'
              : 'border-border hover:border-primary/50',
          ]"
          @click="$emit('set-rsvp', status.value)"
        >
          {{ status.label }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

interface AttendanceEntry {
  id: string
  userId: string
  userName: string
  characterId: string | null
  rsvpStatus: string
  attended: boolean
  // null = not recorded yet; 0 = recorded, awarded nothing. Never coalesce these.
  xp?: number | null
}

interface CampaignMember {
  userId: string
  name: string
}

const props = defineProps<{
  attendance: AttendanceEntry[]
  canManage: boolean
  myRsvp: string
  rsvpStatuses: { value: string; label: string }[]
  members?: CampaignMember[]
}>()

const emit = defineEmits<{
  'set-rsvp': [status: string]
  'set-attended': [userId: string, attended: boolean]
  'add-participant': [userId: string]
  'remove-participant': [userId: string]
  // xp is null when the input is cleared — that's a distinct action from "0", handled by the
  // caller/server, not collapsed here.
  'set-xp': [userId: string, xp: number | null]
}>()

const showPicker = ref(false)

function onXpChange(entry: AttendanceEntry, event: Event) {
  const raw = (event.target as HTMLInputElement).value
  const xp = raw === '' ? null : Number(raw)
  emit('set-xp', entry.userId, xp)
}

const attendingUserIds = computed(() => new Set(props.attendance.map((a) => a.userId)))

const eligibleMembers = computed(() =>
  (props.members ?? []).filter((m) => !attendingUserIds.value.has(m.userId)),
)

function addParticipant(userId: string) {
  showPicker.value = false
  emit('add-participant', userId)
}
</script>
