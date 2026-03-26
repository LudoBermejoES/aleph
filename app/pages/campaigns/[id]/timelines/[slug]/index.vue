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

      <div class="flex items-center justify-between mb-4">
        <h1 class="text-2xl font-bold">{{ timeline.name }}</h1>
        <div class="flex items-center gap-2">
          <div class="flex gap-2" data-testid="view-switcher">
            <Button :variant="view === 'chronicle' ? 'default' : 'outline'" size="sm" @click="view = 'chronicle'">Chronicle</Button>
            <Button :variant="view === 'gantt' ? 'default' : 'outline'" size="sm" @click="view = 'gantt'">Gantt</Button>
            <Button :variant="view === 'calendar' ? 'default' : 'outline'" size="sm" @click="view = 'calendar'">Calendar</Button>
          </div>
          <Button size="sm" data-testid="add-event-btn" @click="showAddEvent = !showAddEvent">+ Add Event</Button>
        </div>
      </div>

      <!-- Add Event Form -->
      <form v-if="showAddEvent" data-testid="add-event-form" class="mb-6 p-4 border border-border rounded-lg space-y-3" @submit.prevent="addEvent">
        <div class="grid grid-cols-2 gap-3">
          <div class="col-span-2">
            <label class="text-sm font-medium">Event Name *</label>
            <input v-model="newEvent.name" required placeholder="Battle of Barovia" class="w-full mt-1 px-3 py-2 rounded border border-input bg-background text-sm" />
          </div>
          <div class="col-span-2">
            <label class="text-sm font-medium">Description</label>
            <input v-model="newEvent.description" placeholder="Optional description" class="w-full mt-1 px-3 py-2 rounded border border-input bg-background text-sm" />
          </div>
          <div>
            <label class="text-sm font-medium">Year</label>
            <input v-model.number="newEvent.year" type="number" class="w-full mt-1 px-3 py-2 rounded border border-input bg-background text-sm" />
          </div>
          <div>
            <label class="text-sm font-medium">Month</label>
            <input v-model.number="newEvent.month" type="number" min="1" class="w-full mt-1 px-3 py-2 rounded border border-input bg-background text-sm" />
          </div>
          <div>
            <label class="text-sm font-medium">Day</label>
            <input v-model.number="newEvent.day" type="number" min="1" class="w-full mt-1 px-3 py-2 rounded border border-input bg-background text-sm" />
          </div>
        </div>
        <div class="flex justify-end gap-2">
          <Button type="button" variant="outline" size="sm" @click="showAddEvent = false">Cancel</Button>
          <Button type="submit" size="sm" :disabled="addingEvent">{{ addingEvent ? 'Adding…' : 'Add Event' }}</Button>
        </div>
      </form>

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

      <!-- Calendar Overlay View (8.5) -->
      <div v-if="view === 'calendar'" data-testid="calendar-overlay-view">
        <div v-if="!calendar" class="text-muted-foreground text-center py-8">
          No calendar configured for this campaign.
          <NuxtLink :to="`/campaigns/${campaignId}/calendars`" class="underline ml-1">Set up a calendar</NuxtLink>
        </div>
        <div v-else>
          <!-- Month navigation -->
          <div class="flex items-center justify-center gap-4 mb-4">
            <Button variant="ghost" size="sm" @click="calPrevMonth">&lt;</Button>
            <span class="text-lg font-semibold">{{ calMonthName(calViewMonth) }} — Year {{ calViewYear }}</span>
            <Button variant="ghost" size="sm" @click="calNextMonth">&gt;</Button>
          </div>
          <!-- Grid -->
          <div class="border border-border rounded-lg overflow-hidden">
            <div class="grid grid-cols-7 bg-muted">
              <div v-for="wd in calWeekdays" :key="wd" class="text-center text-xs font-medium py-2 border-r border-border last:border-r-0">{{ wd }}</div>
            </div>
            <div class="grid grid-cols-7">
              <div v-for="_ in calStartOffset" :key="'o'+_" class="min-h-[70px] border-r border-b border-border bg-muted/20" />
              <div
                v-for="day in calDaysInMonth"
                :key="day"
                class="min-h-[70px] p-1 border-r border-b border-border"
              >
                <span class="text-xs font-medium text-muted-foreground">{{ day }}</span>
                <div v-for="ev in calEventsOnDay(day)" :key="ev.id" class="mt-1 text-[11px] px-1 rounded truncate" :style="{ background: ev.color ? ev.color + '33' : 'var(--color-primary)22' }" :title="ev.name">
                  {{ ev.name }}
                </div>
              </div>
            </div>
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
const view = ref<'chronicle' | 'gantt' | 'calendar'>('chronicle')

// Add event form
const showAddEvent = ref(false)
const addingEvent = ref(false)
const newEvent = ref({ name: '', description: '', year: 1, month: 1, day: 1 })

async function addEvent() {
  addingEvent.value = true
  try {
    await $fetch(`/api/campaigns/${campaignId}/timelines/${slug}/events`, {
      method: 'POST',
      body: {
        name: newEvent.value.name,
        description: newEvent.value.description || undefined,
        date: { year: newEvent.value.year, month: newEvent.value.month, day: newEvent.value.day },
      },
    })
    showAddEvent.value = false
    newEvent.value = { name: '', description: '', year: 1, month: 1, day: 1 }
    await load()
  } catch (e: any) {
    alert(e.data?.message || 'Failed to add event')
  } finally {
    addingEvent.value = false
  }
}

// Calendar overlay state
const calendar = ref<any>(null)
const calViewMonth = ref(1)
const calViewYear = ref(1)

const calConfig = computed(() => {
  if (!calendar.value) return null
  if (calendar.value.config) return calendar.value.config
  try { return typeof calendar.value.configJson === 'string' ? JSON.parse(calendar.value.configJson) : calendar.value.configJson } catch { return null }
})
const calWeekdays = computed(() => calConfig.value?.weekdays || ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'])
const calDaysInMonth = computed(() => calConfig.value?.months?.[calViewMonth.value - 1]?.days || 30)
const calStartOffset = computed(() => {
  if (!calConfig.value?.months) return 0
  let days = 0
  for (let i = 0; i < calViewMonth.value - 1; i++) days += calConfig.value.months[i]?.days || 30
  days += calViewYear.value * (calConfig.value.yearLength || 360)
  return days % calWeekdays.value.length
})

function calMonthName(m: number) {
  return calConfig.value?.months?.[m - 1]?.name || `Month ${m}`
}

function calEventsOnDay(day: number) {
  return (timeline.value?.events || []).filter((ev: any) => {
    const d = ev.date || {}
    return d.year === calViewYear.value && d.month === calViewMonth.value && d.day === day
  })
}

function calPrevMonth() {
  calViewMonth.value--
  if (calViewMonth.value < 1) {
    calViewMonth.value = calConfig.value?.months?.length || 12
    calViewYear.value--
  }
}

function calNextMonth() {
  calViewMonth.value++
  if (calViewMonth.value > (calConfig.value?.months?.length || 12)) {
    calViewMonth.value = 1
    calViewYear.value++
  }
}

async function load() {
  try {
    timeline.value = await $fetch(`/api/campaigns/${campaignId}/timelines/${slug}`)
  } catch {
    timeline.value = null
  }
  // Load first campaign calendar for the overlay view
  try {
    const cals = await $fetch(`/api/campaigns/${campaignId}/calendars`) as any[]
    if (cals?.length) {
      calendar.value = cals[0]
      const cd = cals[0].currentDate || {}
      calViewMonth.value = cd.month || 1
      calViewYear.value = cd.year || 1
    }
  } catch {
    calendar.value = null
  }
}

onMounted(load)
</script>
