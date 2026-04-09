<script setup lang="ts">
defineProps<{
  users: Array<{ id: string; name: string; color: string }>
}>()
</script>

<template>
  <div v-if="users.length > 0" class="flex items-center gap-1">
    <div
      v-for="user in users"
      :key="user.id"
      class="flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold text-white shrink-0"
      :style="{ backgroundColor: user.color }"
      :title="user.name"
    >
      {{ user.name.charAt(0).toUpperCase() }}
    </div>
    <span class="text-xs text-muted-foreground ml-1">
      {{ $t('diagrams.multiplayer.usersEditing', { count: users.length }) }}
    </span>
  </div>
</template>
