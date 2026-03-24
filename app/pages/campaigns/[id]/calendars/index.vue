<template>
  <div class="p-8">
    <div class="flex items-center gap-2 text-sm text-muted-foreground mb-1">
      <NuxtLink :to="`/campaigns/${campaignId}`" class="hover:text-primary">Campaign</NuxtLink>
      <span>/</span><span>Calendars</span>
    </div>
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold">Calendars & Timelines</h1>
    </div>
    <div v-if="calendarList.length" class="space-y-4 mb-8">
      <h2 class="text-lg font-semibold">Calendars</h2>
      <div v-for="cal in calendarList" :key="cal.id" class="p-4 rounded-lg border border-border">
        <div class="flex items-center justify-between">
          <div>
            <span class="font-medium">{{ cal.name }}</span>
            <span v-if="cal.currentDate" class="text-sm text-muted-foreground ml-2">
              Current: Year {{ cal.currentDate.year }}, Month {{ cal.currentDate.month }}, Day {{ cal.currentDate.day }}
            </span>
          </div>
          <span class="text-xs text-muted-foreground">{{ cal.config?.months?.length || 0 }} months, {{ cal.moons?.length || 0 }} moons</span>
        </div>
      </div>
    </div>
    <div v-if="timelineList.length" class="space-y-4">
      <h2 class="text-lg font-semibold">Timelines</h2>
      <div v-for="tl in timelineList" :key="tl.id" class="p-4 rounded-lg border border-border">
        <span class="font-medium">{{ tl.name }}</span>
        <span class="text-sm text-muted-foreground ml-2">{{ tl.events?.length || 0 }} events</span>
      </div>
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
