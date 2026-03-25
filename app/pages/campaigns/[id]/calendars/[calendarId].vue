<template>
  <div class="p-8">
    <div v-if="calendar">
      <div class="flex items-center gap-2 text-sm text-muted-foreground mb-4">
        <NuxtLink :to="`/campaigns/${campaignId}`" class="hover:text-primary">Campaign</NuxtLink>
        <span>/</span>
        <NuxtLink :to="`/campaigns/${campaignId}/calendars`" class="hover:text-primary">Calendars</NuxtLink>
        <span>/</span>
        <span class="text-foreground">{{ calendar.name }}</span>
      </div>

      <div class="flex items-center justify-between mb-6">
        <h1 class="text-2xl font-bold">{{ calendar.name }}</h1>
        <div class="flex items-center gap-2">
          <span class="text-sm text-muted-foreground">
            Current: Year {{ currentDate.year }}, {{ monthName(currentDate.month) }} {{ currentDate.day }}
          </span>
          <Button variant="outline" size="sm" data-testid="advance-date" @click="showAdvance = !showAdvance">
            Advance Date
          </Button>
        </div>
      </div>

      <!-- Advance Date Panel -->
      <div v-if="showAdvance" class="mb-4 p-4 rounded border border-border flex items-center gap-4" data-testid="advance-panel">
        <label class="text-sm">Days:</label>
        <input v-model.number="advanceDays" type="number" min="1" class="w-20 px-2 py-1 rounded border border-input bg-background" />
        <Button size="sm" @click="advanceDate">Advance</Button>
      </div>

      <!-- Month Navigation -->
      <div class="flex items-center justify-center gap-4 mb-4" data-testid="month-nav">
        <Button variant="ghost" size="sm" @click="prevMonth">&lt;</Button>
        <span class="text-lg font-semibold">{{ monthName(viewMonth) }} — Year {{ viewYear }}</span>
        <Button variant="ghost" size="sm" @click="nextMonth">&gt;</Button>
      </div>

      <!-- Calendar Grid -->
      <div class="border border-border rounded-lg overflow-hidden" data-testid="calendar-grid">
        <!-- Weekday Headers -->
        <div class="grid grid-cols-7 bg-muted">
          <div v-for="wd in weekdays" :key="wd" class="text-center text-xs font-medium py-2 border-r border-border last:border-r-0">
            {{ wd }}
          </div>
        </div>

        <!-- Day Cells -->
        <div class="grid grid-cols-7">
          <!-- Empty cells for offset -->
          <div v-for="_ in startOffset" :key="'off'+_" class="min-h-[80px] border-r border-b border-border bg-muted/30" />
          <div
            v-for="day in daysInMonth"
            :key="day"
            :class="[
              'min-h-[80px] p-1 border-r border-b border-border relative',
              isCurrentDay(day) ? 'bg-primary/10' : '',
              seasonColor(day),
            ]"
          >
            <span class="text-xs font-medium">{{ day }}</span>
            <!-- Moon phases -->
            <div v-if="moons.length" class="absolute top-0 right-1 flex gap-0.5">
              <span v-for="m in moonPhases(day)" :key="m.name" :title="`${m.name}: ${m.label}`" class="text-[10px]">
                {{ m.emoji }}
              </span>
            </div>
            <!-- Events -->
            <div v-for="ev in eventsOnDay(day)" :key="ev.id" class="mt-1 text-[11px] px-1 rounded bg-primary/20 truncate" :title="ev.name">
              {{ ev.name }}
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
const calendarId = route.params.calendarId as string

const calendar = ref<any>(null)
const events = ref<any[]>([])
const viewMonth = ref(1)
const viewYear = ref(1)
const showAdvance = ref(false)
const advanceDays = ref(1)

const currentDate = computed(() => {
  if (calendar.value?.currentDate) return calendar.value.currentDate
  return { year: calendar.value?.currentYear || 1, month: calendar.value?.currentMonth || 1, day: calendar.value?.currentDay || 1 }
})

const config = computed(() => {
  // The GET endpoint returns parsed `config` object, but also raw `configJson`
  if (calendar.value?.config) return calendar.value.config
  if (!calendar.value?.configJson) return null
  try { return typeof calendar.value.configJson === 'string' ? JSON.parse(calendar.value.configJson) : calendar.value.configJson } catch { return null }
})

const weekdays = computed(() => config.value?.weekdays || ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'])
const moons = computed(() => calendar.value?.moons || [])

const daysInMonth = computed(() => {
  if (!config.value?.months) return 30
  const month = config.value.months[viewMonth.value - 1]
  return month?.days || 30
})

const startOffset = computed(() => {
  // Simple offset: (year * 365 + dayOfYear) % 7
  if (!config.value?.months) return 0
  let totalDays = 0
  for (let i = 0; i < viewMonth.value - 1; i++) {
    totalDays += config.value.months[i]?.days || 30
  }
  totalDays += viewYear.value * (config.value.yearLength || 360)
  return totalDays % weekdays.value.length
})

function monthName(m: number) {
  return config.value?.months?.[m - 1]?.name || `Month ${m}`
}

function isCurrentDay(day: number) {
  return calendar.value && viewYear.value === currentDate.value.year && viewMonth.value === currentDate.value.month && day === currentDate.value.day
}

function seasonColor(day: number) {
  const seasons = calendar.value?.seasons || []
  for (const s of seasons) {
    const dateVal = viewMonth.value * 100 + day
    const startVal = s.startMonth * 100 + s.startDay
    const endVal = s.endMonth * 100 + s.endDay
    const inSeason = startVal <= endVal
      ? (dateVal >= startVal && dateVal <= endVal)
      : (dateVal >= startVal || dateVal <= endVal)
    if (inSeason) return s.color ? `bg-[${s.color}]/10` : ''
  }
  return ''
}

function moonPhases(day: number) {
  return moons.value.map((m: any) => {
    const totalDays = (viewYear.value * (config.value?.yearLength || 360)) + dayOfYear(viewMonth.value, day)
    const phase = ((totalDays + (m.phaseOffset || 0)) % (m.cycleDays || 28)) / (m.cycleDays || 28)
    const emoji = phase < 0.125 ? '🌑' : phase < 0.375 ? '🌓' : phase < 0.625 ? '🌕' : phase < 0.875 ? '🌗' : '🌑'
    const label = phase < 0.125 ? 'New' : phase < 0.375 ? 'Waxing' : phase < 0.625 ? 'Full' : phase < 0.875 ? 'Waning' : 'New'
    return { name: m.name, emoji, label }
  })
}

function dayOfYear(month: number, day: number) {
  let days = 0
  for (let i = 0; i < month - 1; i++) days += config.value?.months?.[i]?.days || 30
  return days + day
}

function eventsOnDay(day: number) {
  return events.value.filter(e => e.date?.month === viewMonth.value && e.date?.day === day)
}

function prevMonth() {
  viewMonth.value--
  if (viewMonth.value < 1) {
    viewMonth.value = config.value?.months?.length || 12
    viewYear.value--
  }
}

function nextMonth() {
  viewMonth.value++
  if (viewMonth.value > (config.value?.months?.length || 12)) {
    viewMonth.value = 1
    viewYear.value++
  }
}

async function advanceDate() {
  try {
    const res = await $fetch(`/api/campaigns/${campaignId}/calendars/${calendarId}/advance`, {
      method: 'PATCH',
      body: { days: advanceDays.value },
    }) as any
    if (res.currentDate) {
      calendar.value.currentDate = res.currentDate
    } else if (res.currentYear) {
      calendar.value.currentDate = { year: res.currentYear, month: res.currentMonth, day: res.currentDay }
    }
    showAdvance.value = false
    await load()
  } catch (e: any) {
    alert(e.data?.message || 'Failed to advance date')
  }
}

async function load() {
  try {
    calendar.value = await $fetch(`/api/campaigns/${campaignId}/calendars/${calendarId}`)
    viewMonth.value = currentDate.value.month || 1
    viewYear.value = currentDate.value.year || 1
  } catch {
    calendar.value = null
  }

  try {
    events.value = await $fetch(`/api/campaigns/${campaignId}/calendars/${calendarId}/events`, {
      params: { from_year: viewYear.value, to_year: viewYear.value },
    }) as any[]
  } catch {
    events.value = []
  }
}

onMounted(load)
</script>
