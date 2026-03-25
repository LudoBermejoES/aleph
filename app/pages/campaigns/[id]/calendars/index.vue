<template>
  <div class="p-8">
    <div class="flex items-center gap-2 text-sm text-muted-foreground mb-1">
      <NuxtLink :to="`/campaigns/${campaignId}`" class="hover:text-primary">Campaign</NuxtLink>
      <span>/</span><span>Calendars</span>
    </div>
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold">Calendars & Timelines</h1>
      <div class="flex gap-2">
        <!-- New Calendar Dialog -->
        <Dialog v-model:open="showCalCreate">
          <DialogTrigger as-child><Button data-testid="new-calendar-btn">New Calendar</Button></DialogTrigger>
          <DialogContent class="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Create Calendar</DialogTitle></DialogHeader>
            <form @submit.prevent="createCalendar" class="space-y-4">
              <div>
                <label class="text-sm font-medium">Calendar Name *</label>
                <input v-model="calForm.name" required class="w-full mt-1 px-3 py-2 rounded border border-input bg-background" placeholder="Harptos Calendar" />
              </div>
              <div class="grid grid-cols-3 gap-2">
                <div>
                  <label class="text-sm font-medium">Current Year</label>
                  <input v-model.number="calForm.currentYear" type="number" class="w-full mt-1 px-3 py-2 rounded border border-input bg-background" />
                </div>
                <div>
                  <label class="text-sm font-medium">Month</label>
                  <input v-model.number="calForm.currentMonth" type="number" min="1" class="w-full mt-1 px-3 py-2 rounded border border-input bg-background" />
                </div>
                <div>
                  <label class="text-sm font-medium">Day</label>
                  <input v-model.number="calForm.currentDay" type="number" min="1" class="w-full mt-1 px-3 py-2 rounded border border-input bg-background" />
                </div>
              </div>
              <div>
                <div class="flex items-center justify-between mb-2">
                  <label class="text-sm font-medium">Months</label>
                  <Button type="button" variant="outline" size="sm" @click="addMonth">+ Add Month</Button>
                </div>
                <div v-for="(m, i) in calForm.months" :key="i" class="flex gap-2 mb-2">
                  <input v-model="m.name" placeholder="Month name" class="flex-1 px-2 py-1 rounded border border-input bg-background text-sm" />
                  <input v-model.number="m.days" type="number" min="1" placeholder="Days" class="w-20 px-2 py-1 rounded border border-input bg-background text-sm" />
                  <button type="button" @click="calForm.months.splice(i, 1)" class="text-red-500 text-sm px-1 hover:bg-red-50 rounded">x</button>
                </div>
                <p v-if="!calForm.months.length" class="text-sm text-muted-foreground">No months defined yet.</p>
              </div>
              <div>
                <label class="text-sm font-medium">Weekday Names (comma-separated)</label>
                <input v-model="calForm.weekdaysRaw" class="w-full mt-1 px-3 py-2 rounded border border-input bg-background text-sm" placeholder="Sun, Mon, Tue, Wed, Thu, Fri, Sat" />
                <p class="text-xs text-muted-foreground mt-1">Leave empty for default 7-day week.</p>
              </div>
              <div class="flex justify-end gap-2">
                <Button type="button" variant="outline" @click="showCalCreate = false">Cancel</Button>
                <Button type="submit" :disabled="calCreating">{{ calCreating ? 'Creating...' : 'Create' }}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        <!-- New Timeline Dialog -->
        <Dialog v-model:open="showTlCreate">
          <DialogTrigger as-child><Button variant="outline" data-testid="new-timeline-btn">New Timeline</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Timeline</DialogTitle></DialogHeader>
            <form @submit.prevent="createTimeline" class="space-y-4">
              <div>
                <label class="text-sm font-medium">Timeline Name *</label>
                <input v-model="tlForm.name" required class="w-full mt-1 px-3 py-2 rounded border border-input bg-background" placeholder="Campaign Arc 1" />
              </div>
              <div>
                <label class="text-sm font-medium">Description</label>
                <textarea v-model="tlForm.description" rows="3" class="w-full mt-1 px-3 py-2 rounded border border-input bg-background" placeholder="Optional description..." />
              </div>
              <div class="flex justify-end gap-2">
                <Button type="button" variant="outline" @click="showTlCreate = false">Cancel</Button>
                <Button type="submit" :disabled="tlCreating">{{ tlCreating ? 'Creating...' : 'Create' }}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>

    <div v-if="calendarList.length" class="space-y-4 mb-8">
      <h2 class="text-lg font-semibold">Calendars</h2>
      <NuxtLink v-for="cal in calendarList" :key="cal.id" :to="`/campaigns/${campaignId}/calendars/${cal.id}`" class="block p-4 rounded-lg border border-border hover:border-primary/50 transition-colors">
        <div class="flex items-center justify-between">
          <div>
            <span class="font-medium">{{ cal.name }}</span>
            <span class="text-sm text-muted-foreground ml-2">
              Current: Year {{ cal.currentYear }}, Month {{ cal.currentMonth }}, Day {{ cal.currentDay }}
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
const router = useRouter()
const campaignId = route.params.id as string
const calendarList = ref<any[]>([])
const timelineList = ref<any[]>([])

// Calendar create
const showCalCreate = ref(false)
const calCreating = ref(false)
const calForm = ref({
  name: '', currentYear: 1, currentMonth: 1, currentDay: 1,
  months: [{ name: '', days: 30 }] as Array<{ name: string; days: number }>,
  weekdaysRaw: '',
})

function addMonth() {
  calForm.value.months.push({ name: '', days: 30 })
}

async function createCalendar() {
  calCreating.value = true
  try {
    const yearLength = calForm.value.months.reduce((sum, m) => sum + m.days, 0)
    const weekdays = calForm.value.weekdaysRaw.trim()
      ? calForm.value.weekdaysRaw.split(',').map(s => s.trim()).filter(Boolean)
      : undefined
    const res = await $fetch(`/api/campaigns/${campaignId}/calendars`, {
      method: 'POST',
      body: {
        name: calForm.value.name,
        configJson: { months: calForm.value.months, yearLength, ...(weekdays ? { weekdays } : {}) },
        currentYear: calForm.value.currentYear,
        currentMonth: calForm.value.currentMonth,
        currentDay: calForm.value.currentDay,
      },
    }) as any
    showCalCreate.value = false
    await router.push(`/campaigns/${campaignId}/calendars/${res.id}`)
  } catch (e: any) {
    alert(e.data?.message || 'Failed to create calendar')
  } finally {
    calCreating.value = false
  }
}

// Timeline create
const showTlCreate = ref(false)
const tlCreating = ref(false)
const tlForm = ref({ name: '', description: '' })

async function createTimeline() {
  tlCreating.value = true
  try {
    const res = await $fetch(`/api/campaigns/${campaignId}/timelines`, {
      method: 'POST',
      body: tlForm.value,
    }) as any
    showTlCreate.value = false
    await router.push(`/campaigns/${campaignId}/timelines/${res.slug}`)
  } catch (e: any) {
    alert(e.data?.message || 'Failed to create timeline')
  } finally {
    tlCreating.value = false
  }
}

async function load() {
  try { calendarList.value = await $fetch(`/api/campaigns/${campaignId}/calendars`) as any[] } catch { calendarList.value = [] }
  try { timelineList.value = await $fetch(`/api/campaigns/${campaignId}/timelines`) as any[] } catch { timelineList.value = [] }
}

onMounted(load)
</script>
