<template>
  <div class="min-h-screen flex items-center justify-center bg-background text-foreground">
    <div class="text-center max-w-md px-4">
      <h1 class="text-6xl font-bold text-muted-foreground mb-4">{{ error?.statusCode || 500 }}</h1>
      <p class="text-lg text-muted-foreground mb-2">{{ error?.statusMessage || 'Something went wrong' }}</p>
      <p v-if="error?.message" class="text-sm text-muted-foreground mb-6">{{ error.message }}</p>
      <button @click="handleError" class="text-primary underline">Back to home</button>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ error: { statusCode: number; statusMessage: string; message?: string } }>()

function handleError() {
  clearError({ redirect: '/' })
}
</script>
