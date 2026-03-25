<template>
  <div class="p-8">
    <div class="flex items-center gap-2 text-sm text-muted-foreground mb-1">
      <NuxtLink :to="`/campaigns/${campaignId}`" class="hover:text-primary">Campaign</NuxtLink>
      <span>/</span><span>Calendars</span>
    </div>
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold">Calendars & Timelines</h1>
      <div class="flex gap-2">
        <NuxtLink :to="`/campaigns/${campaignId}/calendars/new`">
          <Button data-testid="new-calendar-btn">New Calendar</Button>
        </NuxtLink>
        <NuxtLink :to="`/campaigns/${campaignId}/timelines/new`">
          <Button variant="outline" data-testid="new-timeline-btn">New Timeline</Button>
        </NuxtLink>
      </div>
    </div>

    <div v-if="calendarList.length" class="space-y-4 mb-8">
      <h2 class="text-lg font-semibold">Calendars</h2>
      <NuxtLink v-for="cal in calendarList" :key="cal.id" :to="`/campaigns/${campaignId}/calendars/${cal.id}`" class="block p-4 rounded-lg border border-border hover:border-primary/50 transition-colors">
        <div class="flex items-center justify-between">
          <div>
            <span class="font-medium">{{ cal.name }}</span>
            <span class="text-sm text-muted-foreground ml-2">
              Current: Year {{ cal.currentDate?.year || cal.currentYear }}, Month {{ cal.currentDate?.month || cal.currentMonth }}, Day {{ cal.currentDate?.day || cal.currentDay }}
            </span>
          </div>
          <span class="text-xs text-muted-foreground">{{ cal.config?.months?.length || 0 }} months, {{ cal.moons?.length || 0 }} moons</span>
        </div>
      </NuxtLink>
    </div>
    <div v-if="timelineList.length" class="space-y-4">
      <h2 class="text-lg font-semibold">Timelines</h2>
      <NuxtLink v-for="tl in timelineList" :key="tl.id" :to="`/campaigns/${campaignId}/timelines/${tl.slug}`" class="block p-4 rounded-lg border border-border hover:border-primary/50 transition-colors">
        <span class="font-medium">{{ tl.name }}</span>
        <span class="text-sm text-muted-foreground ml-2">{{ tl.events?.length || 0 }} events</span>
      </NuxtLink>
    </div>
    <p v-if="!calendarList.length && !timelineList.length" class="text-muted-foreground text-center py-8">No calendars or timelines yet.</p>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const campaignId = route.params.id as string
const calendarList = ref<any[]>([])
const timelineList = ref<any[]>([])

async function load() {
  try { calendarList.value = await $fetch(`/api/campaigns/${campaignId}/calendars`) as any[] } catch { calendarList.value = [] }
  try { timelineList.value = await $fetch(`/api/campaigns/${campaignId}/timelines`) as any[] } catch { timelineList.value = [] }
}

onMounted(load)
</script>
