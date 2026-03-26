<template>
  <div>
    <div v-if="keys.length === 0" class="text-muted-foreground text-sm py-4">
      {{ $t('apiKeys.empty') }}
    </div>
    <table v-else class="w-full text-sm">
      <thead>
        <tr class="border-b text-left text-muted-foreground">
          <th class="pb-2 pr-4 font-medium">{{ $t('apiKeys.name') }}</th>
          <th class="pb-2 pr-4 font-medium">{{ $t('apiKeys.prefix') }}</th>
          <th class="pb-2 pr-4 font-medium">{{ $t('apiKeys.created') }}</th>
          <th class="pb-2 pr-4 font-medium">{{ $t('apiKeys.lastUsed') }}</th>
          <th class="pb-2 font-medium"></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="key in keys" :key="key.id" class="border-b last:border-0">
          <td class="py-2 pr-4">{{ key.name }}</td>
          <td class="py-2 pr-4 font-mono text-xs">{{ key.keyPrefix }}…</td>
          <td class="py-2 pr-4 text-muted-foreground">{{ formatDate(key.createdAt) }}</td>
          <td class="py-2 pr-4 text-muted-foreground">{{ key.lastUsedAt ? formatDate(key.lastUsedAt) : '—' }}</td>
          <td class="py-2">
            <button
              class="text-destructive text-xs hover:underline"
              @click="$emit('revoke', key.id)"
            >
              {{ $t('apiKeys.revoke') }}
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import type { ApiKey } from '~/composables/useApiKeys'

defineProps<{ keys: ApiKey[] }>()
defineEmits<{ (e: 'revoke', id: string): void }>()

function formatDate(d: string | Date | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString()
}
</script>
