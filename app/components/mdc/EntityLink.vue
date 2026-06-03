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
  type?: string
}>()

const route = useRoute()

// Map entity type values to their dedicated route segment.
// Types not listed here (or missing type) fall back to the generic /entities/ route.
const ENTITY_TYPE_ROUTES: Record<string, string> = {
  character: 'characters',
  location: 'locations',
  organization: 'organizations',
  quest: 'quests',
  session: 'sessions',
  item: 'items',
  map: 'maps',
  arc: 'arcs',
  calendar: 'calendars',
  diagram: 'diagrams',
  shop: 'shops',
}

const href = computed(() => {
  const campaign = props.campaignId || (route.params.id as string | undefined)
  if (!props.slug || !campaign) return '#'
  const segment = props.type ? (ENTITY_TYPE_ROUTES[props.type] ?? 'entities') : 'entities'
  return `/campaigns/${campaign}/${segment}/${props.slug}`
})
</script>
