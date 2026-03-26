<template>
  <div class="p-8">
    <div class="flex items-center gap-2 text-sm text-muted-foreground mb-1">
      <NuxtLink :to="`/campaigns/${campaignId}`" class="hover:text-primary">Campaign</NuxtLink>
      <span>/</span><span>{{ $t('calendars.title') }}</span>
    </div>
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold">{{ $t('calendars.title') }}</h1>
      <div class="flex gap-2">
        <NuxtLink :to="`/campaigns/${campaignId}/calendars/new`">
          <Button data-testid="new-calendar-btn">{{ $t('calendars.newCalendar') }}</Button>
        </NuxtLink>
        <NuxtLink :to="`/campaigns/${campaignId}/timelines/new`">
          <Button variant="outline" data-testid="new-timeline-btn">{{ $t('calendars.newTimeline') }}</Button>
        </NuxtLink>
      </div>
    </div>

    <LoadingSkeleton v-if="loading" :rows="4" />
    <template v-else>
    <div v-if="calendarList.length" class="space-y-4 mb-8">
      <h2 class="text-lg font-semibold">{{ $t('calendars.calendarsHeading') }}</h2>
      <NuxtLink v-for="cal in calendarList" :key="cal.id" :to="`/campaigns/${campaignId}/calendars/${cal.id}`" class="block p-4 rounded-lg border border-border hover:border-primary/50 transition-colors">
        <div class="flex items-center justify-between">
          <div>
            <span class="font-medium">{{ cal.name }}</span>
            <span class="text-sm text-muted-foreground ml-2">
              {{ $t('calendars.currentDate', { year: cal.currentDate?.year || cal.currentYear, month: cal.currentDate?.month || cal.currentMonth, day: cal.currentDate?.day || cal.currentDay }) }}
            </span>
          </div>
          <span class="text-xs text-muted-foreground">{{ $t('calendars.monthsInfo', { months: cal.config?.months?.length || 0, moons: cal.moons?.length || 0 }) }}</span>
        </div>
      </NuxtLink>
    </div>
    <div v-if="timelineList.length" class="space-y-4">
      <h2 class="text-lg font-semibold">{{ $t('calendars.timelinesHeading') }}</h2>
      <NuxtLink v-for="tl in timelineList" :key="tl.id" :to="`/campaigns/${campaignId}/timelines/${tl.slug}`" class="block p-4 rounded-lg border border-border hover:border-primary/50 transition-colors">
        <span class="font-medium">{{ tl.name }}</span>
        <span class="text-sm text-muted-foreground ml-2">{{ tl.events?.length || 0 }} {{ $t('calendars.events') }}</span>
      </NuxtLink>
    </div>
    <EmptyState v-if="!calendarList.length && !timelineList.length" icon="📅" :title="$t('calendars.empty')" :description="$t('calendars.emptyDescription')" />
    </template>
    <ErrorToast v-if="error" :message="error" @dismiss="dismissError" />
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const campaignId = route.params.id as string
import type { Calendar, Timeline } from '~/types/api'

const calendarList = ref<Calendar[]>([])
const timelineList = ref<Timeline[]>([])
const { loading, error, withLoading, dismissError } = useLoadingState()
const api = useCampaignApi(campaignId)

async function load() {
  await withLoading(async () => {
    const [cals, tls] = await Promise.all([
      api.getCalendars().catch(() => []),
      api.getTimelines().catch(() => []),
    ])
    calendarList.value = cals
    timelineList.value = tls
  })
}

onMounted(load)
</script>
