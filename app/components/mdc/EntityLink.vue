<template>
  <NuxtLink :to="href" class="text-primary underline decoration-dotted hover:decoration-solid">
    <slot>{{ name }}</slot>
  </NuxtLink>
</template>

<script setup lang="ts">
const props = defineProps<{
  slug?: string
  name?: string
  campaignId?: string
}>()

const route = useRoute()

const href = computed(() => {
  const campaign = props.campaignId || (route.params.id as string | undefined)
  if (props.slug && campaign) {
    return `/campaigns/${campaign}/entities/${props.slug}`
  }
  return '#'
})
</script>
