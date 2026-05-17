<template>
  <div class="p-8 max-w-2xl">
    <h1 class="text-2xl font-bold mb-6">{{ $t('settings.title') }}</h1>

    <!-- Admin section -->
    <section v-if="isAdmin" class="mb-8">
      <h2 class="text-lg font-semibold mb-1">{{ $t('adminUsers.sectionTitle') }}</h2>
      <p class="text-sm text-muted-foreground mb-4">{{ $t('adminUsers.sectionDescription') }}</p>
      <NuxtLink
        to="/settings/users"
        class="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
      >
        {{ $t('adminUsers.manageLink') }} →
      </NuxtLink>
    </section>

    <!-- API Keys section -->
    <section>
      <h2 class="text-lg font-semibold mb-1">{{ $t('apiKeys.title') }}</h2>
      <p class="text-sm text-muted-foreground mb-4">{{ $t('apiKeys.description') }}</p>

      <ApiKeyCreateDialog class="mb-6" @created="refresh" />

      <ApiKeyList :keys="keys" @revoke="handleRevoke" />
    </section>
  </div>
</template>

<script setup lang="ts">
import { useApiKeys, type ApiKey } from '~/composables/useApiKeys'
import { useCurrentUser } from '~/composables/useAuth'

const { isAdmin } = useCurrentUser()
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
