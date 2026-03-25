<template>
  <div class="p-8">
    <div v-if="timeline">
      <div class="flex items-center gap-2 text-sm text-muted-foreground mb-4">
        <NuxtLink :to="`/campaigns/${campaignId}`" class="hover:text-primary">Campaign</NuxtLink>
        <span>/</span>
        <NuxtLink :to="`/campaigns/${campaignId}/calendars`" class="hover:text-primary">Calendars</NuxtLink>
        <span>/</span>
        <span class="text-foreground">{{ timeline.name }}</span>
      </div>

      <div class="flex items-center justify-between mb-6">
        <h1 class="text-2xl font-bold">{{ timeline.name }}</h1>
        <div class="flex gap-2" data-testid="view-switcher">
          <Button :variant="view === 'chronicle' ? 'default' : 'outline'" size="sm" @click="view = 'chronicle'">Chronicle</Button>
          <Button :variant="view === 'gantt' ? 'default' : 'outline'" size="sm" @click="view = 'gantt'">Gantt</Button>
        </div>
      </div>

      <!-- Chronicle View (8.3) -->
      <div v-if="view === 'chronicle'" data-testid="chronicle-view" class="space-y-4">
        <div v-if="!timeline.events?.length" class="text-muted-foreground text-center py-8">No events yet.</div>
        <div
          v-for="(ev, i) in timeline.events"
          :key="ev.id"
          class="flex gap-4"
        >
          <!-- Timeline line -->
          <div class="flex flex-col items-center">
            <div class="w-3 h-3 rounded-full bg-primary shrink-0" />
            <div v-if="i < timeline.events.length - 1" class="w-0.5 flex-1 bg-border" />
          </div>
          <!-- Event content -->
          <div class="pb-6">
            <div class="text-xs text-muted-foreground">
              Year {{ ev.date?.year }}, Month {{ ev.date?.month }}, Day {{ ev.date?.day }}
            </div>
            <h3 class="font-medium">{{ ev.name }}</h3>
            <p v-if="ev.description" class="text-sm text-muted-foreground mt-1">{{ ev.description }}</p>
          </div>
        </div>
      </div>

      <!-- Gantt View (8.4) -->
      <div v-if="view === 'gantt'" data-testid="gantt-view" class="space-y-2">
        <div v-if="!timeline.events?.length" class="text-muted-foreground text-center py-8">No events yet.</div>
        <div v-for="ev in timeline.events" :key="ev.id" class="flex items-center gap-2">
          <span class="text-xs text-muted-foreground w-24 shrink-0">Y{{ ev.date?.year }}M{{ ev.date?.month }}</span>
          <div class="h-6 rounded bg-primary/30 flex items-center px-2 text-xs" :style="{ minWidth: '100px' }">
            {{ ev.name }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const campaignId = route.params.id as string
const slug = route.params.slug as string
const timeline = ref<any>(null)
const view = ref<'chronicle' | 'gantt'>('chronicle')

async function load() {
  try {
    timeline.value = await $fetch(`/api/campaigns/${campaignId}/timelines/${slug}`)
  } catch {
    timeline.value = null
  }
}

onMounted(load)
</script>
