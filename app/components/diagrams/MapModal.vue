<template>
  <div
    v-if="open"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
    data-testid="map-modal-overlay"
    @click.self="$emit('close')"
  >
    <div
      class="relative bg-background rounded-lg shadow-2xl w-[90vw] h-[85vh] flex flex-col overflow-hidden"
    >
      <!-- Header -->
      <div class="flex items-center justify-between px-4 py-2 border-b border-border shrink-0">
        <span class="text-sm font-medium">{{ $t('diagrams.mapModal.title') }}</span>
        <button
          class="p-1 rounded hover:bg-accent transition-colors"
          :title="$t('common.close')"
          data-testid="map-modal-close-btn"
          @click="$emit('close')"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Map iframe -->
      <iframe
        v-if="mapId && campaignId"
        :src="`/campaigns/${campaignId}/maps/${mapId}`"
        class="flex-1 w-full border-0"
        data-testid="map-modal-iframe"
        :title="$t('diagrams.mapModal.title')"
      ></iframe>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  open: boolean
  mapId: string
  campaignId: string
}>()

defineEmits<{
  close: []
}>()
</script>
