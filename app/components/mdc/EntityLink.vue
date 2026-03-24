<template>
  <NuxtLink
    :to="href"
    class="text-primary underline decoration-dotted hover:decoration-solid"
  >
    <slot>{{ name }}</slot>
  </NuxtLink>
</template>

<script setup lang="ts">
const props = defineProps<{
  slug?: string
  name?: string
  campaignId?: string
}>()

const href = computed(() => {
  if (props.slug && props.campaignId) {
    return `/campaigns/${props.campaignId}/entities/${props.slug}`
  }
  return '#'
})
</script>
