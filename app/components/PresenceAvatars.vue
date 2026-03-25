<template>
  <div v-if="users.length > 0" class="flex items-center -space-x-2">
    <div
      v-for="user in displayUsers"
      :key="user.userId"
      class="relative flex items-center justify-center w-7 h-7 rounded-full border-2 border-background text-[10px] font-semibold text-white"
      :style="{ backgroundColor: userColor(user.userId) }"
      :title="`${user.name} (${user.role})`"
    >
      {{ initials(user.name) }}
    </div>
    <div
      v-if="overflow > 0"
      class="relative flex items-center justify-center w-7 h-7 rounded-full border-2 border-background bg-muted text-[10px] font-semibold text-muted-foreground"
      :title="`+${overflow} more`"
    >
      +{{ overflow }}
    </div>
  </div>
</template>

<script setup lang="ts">
interface PresenceUser {
  userId: string
  name: string
  role: string
}

const props = defineProps<{
  users: PresenceUser[]
  maxVisible?: number
}>()

const maxShow = computed(() => props.maxVisible || 5)

const displayUsers = computed(() => props.users.slice(0, maxShow.value))
const overflow = computed(() => Math.max(0, props.users.length - maxShow.value))

function initials(name: string): string {
  return name
    .split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

// Deterministic color from userId
function userColor(userId: string): string {
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash)
  }
  const hue = Math.abs(hash) % 360
  return `hsl(${hue}, 65%, 45%)`
}
</script>
