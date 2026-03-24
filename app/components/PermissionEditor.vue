<template>
  <div class="space-y-4">
    <h3 class="text-sm font-medium">Permission Overrides</h3>
    <div v-for="entry in permissions" :key="entry.id" class="flex items-center gap-4 p-2 rounded border border-border">
      <span class="text-sm flex-1">
        {{ entry.targetRole ? `Role: ${entry.targetRole}` : `User: ${entry.targetUserId}` }}
      </span>
      <span class="text-sm text-muted-foreground">{{ entry.permission }}</span>
      <select
        :value="entry.effect"
        @change="updateEffect(entry, ($event.target as HTMLSelectElement).value)"
        class="rounded border border-input bg-background px-2 py-1 text-sm"
      >
        <option value="allow">Allow</option>
        <option value="deny">Deny</option>
      </select>
      <button @click="$emit('remove', entry.id)" class="text-destructive text-sm">Remove</button>
    </div>
    <p v-if="!permissions.length" class="text-sm text-muted-foreground">No overrides set. Using campaign role defaults.</p>
    <Button size="sm" variant="outline" @click="$emit('add')">Add Override</Button>
  </div>
</template>

<script setup lang="ts">
import { Button } from '~/components/ui/button'

interface PermissionEntry {
  id: string
  targetUserId?: string
  targetRole?: string
  permission: string
  effect: string
}

const props = defineProps<{
  permissions: PermissionEntry[]
}>()

const emit = defineEmits<{
  add: []
  remove: [id: string]
  update: [entry: PermissionEntry]
}>()

function updateEffect(entry: PermissionEntry, effect: string) {
  emit('update', { ...entry, effect })
}
</script>
