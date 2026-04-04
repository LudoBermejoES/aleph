<template>
  <div class="flex items-center justify-center min-h-[60vh]">
    <div class="text-center">
      <h1 class="text-6xl font-bold text-muted-foreground mb-4">404</h1>
      <p class="text-lg text-muted-foreground mb-6">{{ $t('errors.notFoundTitle') }}</p>
      <NuxtLink to="/" class="text-primary underline">{{ $t('errors.notFoundBack') }}</NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default' })
</script>
