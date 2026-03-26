<template>
  <div class="p-8 max-w-2xl">
    <h1 class="text-2xl font-bold mb-6">{{ $t('settings.title') }}</h1>

    <!-- API Keys section -->
    <section>
      <h2 class="text-lg font-semibold mb-1">{{ $t('apiKeys.title') }}</h2>
      <p class="text-sm text-muted-foreground mb-4">{{ $t('apiKeys.description') }}</p>

      <ApiKeyCreateDialog class="mb-6" @created="refresh" />

      <ApiKeyList
        :keys="keys"
        @revoke="handleRevoke"
      />
    </section>
  </div>
</template>

<script setup lang="ts">
import { useApiKeys, type ApiKey } from '~/composables/useApiKeys'

const { fetchApiKeys, revokeApiKey } = useApiKeys()
const keys = ref<ApiKey[]>([])

async function refresh() {
  keys.value = await fetchApiKeys()
}

async function handleRevoke(id: string) {
  if (!confirm(useI18n().t('apiKeys.revokeConfirm'))) return
  await revokeApiKey(id)
  await refresh()
}

onMounted(refresh)
</script>
