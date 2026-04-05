<template>
  <button
    type="button"
    :class="[
      'text-xs px-2 py-0.5 rounded font-medium transition-colors',
      revealed
        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-800/40'
        : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-800/40',
    ]"
    :disabled="loading"
    @click="toggle"
  >
    {{ revealed ? $t('secrets.unreveal') : $t('secrets.reveal') }}
  </button>
</template>

<script setup lang="ts">
const props = defineProps<{
  campaignId: string
  entitySlug: string
  blockId: string
  revealed: boolean
}>()

const emit = defineEmits<{
  update: [blockId: string, revealed: boolean]
}>()

const loading = ref(false)

async function toggle() {
  loading.value = true
  try {
    if (props.revealed) {
      await fetch(
        `/api/campaigns/${props.campaignId}/entities/${props.entitySlug}/secrets/${props.blockId}`,
        { method: 'DELETE', credentials: 'include' },
      )
      emit('update', props.blockId, false)
    } else {
      await fetch(
        `/api/campaigns/${props.campaignId}/entities/${props.entitySlug}/secrets`,
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ blockId: props.blockId }),
        },
      )
      emit('update', props.blockId, true)
    }
  } catch { /* silently ignore */ } finally {
    loading.value = false
  }
}
</script>
