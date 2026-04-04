<template>
  <div class="mb-6 p-4 rounded-lg border border-border">
    <h2 class="text-sm font-semibold mb-3">{{ $t('sessions.attendance') }}</h2>
    <div v-if="attendance.length" class="space-y-2">
      <div v-for="a in attendance" :key="a.id" class="flex items-center gap-3">
        <span :class="['w-2 h-2 rounded-full flex-shrink-0', a.rsvpStatus === 'accepted' ? 'bg-green-500' : a.rsvpStatus === 'declined' ? 'bg-red-500' : 'bg-yellow-500']" />
        <span class="text-sm flex-1">{{ a.userName }}</span>
        <span v-if="a.characterId" class="text-xs text-muted-foreground">{{ a.characterId }}</span>
        <label v-if="canManage" class="flex items-center gap-1 text-xs text-muted-foreground cursor-pointer">
          <input type="checkbox" :checked="a.attended" class="rounded" @change="$emit('set-attended', a.userId, ($event.target as HTMLInputElement).checked)" />
          {{ $t('sessions.attended') }}
        </label>
      </div>
    </div>
    <p v-else class="text-xs text-muted-foreground italic">{{ $t('sessions.noAttendance') }}</p>

    <div class="mt-3 pt-3 border-t border-border">
      <span class="text-xs text-muted-foreground mr-2">{{ $t('sessions.yourRsvp') }}</span>
      <div class="inline-flex gap-1 mt-1">
        <button
          v-for="status in rsvpStatuses"
          :key="status.value"
          :class="['px-2 py-0.5 text-xs rounded border transition-colors', myRsvp === status.value ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:border-primary/50']"
          @click="$emit('set-rsvp', status.value)"
        >
          {{ status.label }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  attendance: any[]
  canManage: boolean
  myRsvp: string
  rsvpStatuses: { value: string; label: string }[]
}>()

defineEmits<{
  'set-rsvp': [status: string]
  'set-attended': [userId: string, attended: boolean]
}>()
</script>
