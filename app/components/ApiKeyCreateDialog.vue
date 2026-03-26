<template>
  <div>
    <!-- Create form -->
    <div class="flex gap-2">
      <input
        v-model="newKeyName"
        type="text"
        :placeholder="$t('apiKeys.namePlaceholder')"
        class="flex-1 rounded border border-input bg-background px-3 py-1.5 text-sm text-foreground"
        @keydown.enter="handleCreate"
      />
      <button
        class="rounded bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        :disabled="creating || !newKeyName.trim()"
        @click="handleCreate"
      >
        {{ creating ? $t('common.loading') : $t('apiKeys.generate') }}
      </button>
    </div>
    <p v-if="nameError" class="mt-1 text-xs text-destructive">{{ nameError }}</p>

    <!-- One-time key modal -->
    <div
      v-if="createdKey"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
    >
      <div class="w-full max-w-md rounded-lg bg-card p-6 shadow-lg">
        <h3 class="mb-2 text-lg font-semibold">{{ $t('apiKeys.newKeyTitle') }}</h3>
        <p class="mb-4 text-sm text-muted-foreground">{{ $t('apiKeys.newKeyWarning') }}</p>
        <div class="mb-4 flex items-center gap-2 rounded border bg-muted p-2 font-mono text-xs break-all">
          <span class="flex-1 select-all">{{ createdKey }}</span>
          <button
            class="shrink-0 rounded bg-primary px-2 py-1 text-xs text-primary-foreground hover:bg-primary/90"
            @click="copyKey"
          >
            {{ copied ? $t('apiKeys.copied') : $t('apiKeys.copy') }}
          </button>
        </div>
        <button
          class="w-full rounded bg-secondary px-3 py-2 text-sm hover:bg-secondary/80"
          @click="closeModal"
        >
          {{ $t('apiKeys.doneHidden') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useApiKeys } from '~/composables/useApiKeys'

const emit = defineEmits<{ (e: 'created'): void }>()

const { createApiKey } = useApiKeys()
const newKeyName = ref('')
const creating = ref(false)
const nameError = ref('')
const createdKey = ref<string | null>(null)
const copied = ref(false)

async function handleCreate() {
  nameError.value = ''
  if (!newKeyName.value.trim()) {
    nameError.value = 'Name is required'
    return
  }
  creating.value = true
  try {
    const result = await createApiKey(newKeyName.value.trim())
    createdKey.value = result.key
    newKeyName.value = ''
  } finally {
    creating.value = false
  }
}

async function copyKey() {
  if (!createdKey.value) return
  await navigator.clipboard.writeText(createdKey.value)
  copied.value = true
  setTimeout(() => { copied.value = false }, 2000)
}

function closeModal() {
  createdKey.value = null
  emit('created')
}
</script>
