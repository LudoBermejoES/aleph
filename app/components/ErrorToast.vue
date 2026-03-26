<template>
  <Teleport to="body">
    <Transition name="toast">
      <div v-if="visible" class="fixed bottom-4 right-4 z-50 max-w-sm bg-destructive text-destructive-foreground px-4 py-3 rounded-lg shadow-lg flex items-center gap-3" data-testid="error-toast">
        <span class="text-sm flex-1">{{ message }}</span>
        <button @click="dismiss" class="text-destructive-foreground/70 hover:text-destructive-foreground text-lg leading-none">&times;</button>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
const props = defineProps<{ message: string; duration?: number }>()
const emit = defineEmits<{ dismiss: [] }>()
const visible = ref(true)

let timer: ReturnType<typeof setTimeout> | null = null

function dismiss() {
  visible.value = false
  emit('dismiss')
}

onMounted(() => {
  timer = setTimeout(dismiss, props.duration || 5000)
})

onUnmounted(() => {
  if (timer) clearTimeout(timer)
})
</script>

<style scoped>
.toast-enter-active, .toast-leave-active { transition: all 0.3s ease; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateY(1rem); }
</style>
