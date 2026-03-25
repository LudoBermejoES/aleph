<template>
  <Transition name="toast">
    <div
      v-if="visible"
      class="fixed bottom-4 right-4 z-50 flex items-start gap-3 max-w-sm p-4 rounded-lg border border-border bg-card shadow-lg"
      role="alert"
    >
      <div class="flex-1 min-w-0">
        <p v-if="notification.from" class="text-xs text-muted-foreground mb-0.5">
          {{ notification.from.name }}
        </p>
        <p class="text-sm text-foreground">{{ notification.message }}</p>
      </div>
      <button
        class="shrink-0 p-1 text-muted-foreground hover:text-foreground rounded"
        @click="dismiss"
      >
        &times;
      </button>
    </div>
  </Transition>
</template>

<script setup lang="ts">
interface ToastNotification {
  id: string
  type: string
  message: string
  from?: { userId: string; name: string }
  timestamp: number
}

const props = defineProps<{
  notification: ToastNotification
  duration?: number
}>()

const emit = defineEmits<{
  dismiss: [id: string]
}>()

const visible = ref(true)
let timer: ReturnType<typeof setTimeout> | null = null

function dismiss() {
  visible.value = false
  emit('dismiss', props.notification.id)
}

onMounted(() => {
  timer = setTimeout(() => {
    dismiss()
  }, props.duration || 5000)
})

onUnmounted(() => {
  if (timer) clearTimeout(timer)
})
</script>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}
.toast-enter-from {
  opacity: 0;
  transform: translateY(16px);
}
.toast-leave-to {
  opacity: 0;
  transform: translateX(100%);
}
</style>
