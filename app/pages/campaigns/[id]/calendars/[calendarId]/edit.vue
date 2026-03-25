<template>
  <div class="p-8 max-w-3xl">
    <div class="flex items-center gap-2 text-sm text-muted-foreground mb-4">
      <NuxtLink :to="`/campaigns/${campaignId}`" class="hover:text-primary">Campaign</NuxtLink>
      <span>/</span>
      <NuxtLink :to="`/campaigns/${campaignId}/calendars`" class="hover:text-primary">Calendars</NuxtLink>
      <span>/</span>
      <NuxtLink :to="`/campaigns/${campaignId}/calendars/${calendarId}`" class="hover:text-primary">{{ form.name || 'Calendar' }}</NuxtLink>
      <span>/</span><span>Edit</span>
    </div>
    <h1 class="text-2xl font-bold mb-6">Edit Calendar</h1>
    <CalendarForm v-if="loaded" v-model="form" submit-label="Save Changes" :submitting="submitting" @submit="save">
      <template #cancel>
        <NuxtLink :to="`/campaigns/${campaignId}/calendars/${calendarId}`"><Button variant="outline">Cancel</Button></NuxtLink>
      </template>
    </CalendarForm>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const router = useRouter()
const campaignId = route.params.id as string
const calendarId = route.params.calendarId as string
const submitting = ref(false)
const loaded = ref(false)
const form = ref({
  name: '', currentYear: 1, currentMonth: 1, currentDay: 1,
  months: [] as Array<{ name: string; days: number }>,
  weekdaysRaw: '',
})

onMounted(async () => {
  try {
    const cal = await $fetch(`/api/campaigns/${campaignId}/calendars/${calendarId}`) as any
    const config = cal.config || {}
    const cd = cal.currentDate || {}
    form.value = {
      name: cal.name || '',
      currentYear: cd.year || 1,
      currentMonth: cd.month || 1,
      currentDay: cd.day || 1,
      months: config.months || [],
      weekdaysRaw: (config.weekdays || []).join(', '),
    }
    loaded.value = true
  } catch {
    alert('Failed to load calendar')
    await router.push(`/campaigns/${campaignId}/calendars/${calendarId}`)
  }
})

async function save() {
  submitting.value = true
  try {
    const yearLength = form.value.months.reduce((sum, m) => sum + m.days, 0)
    const weekdays = form.value.weekdaysRaw.trim()
      ? form.value.weekdaysRaw.split(',').map(s => s.trim()).filter(Boolean)
      : undefined
    await $fetch(`/api/campaigns/${campaignId}/calendars/${calendarId}`, {
      method: 'PUT',
      body: {
        name: form.value.name,
        configJson: { months: form.value.months, yearLength, ...(weekdays ? { weekdays } : {}) },
        currentYear: form.value.currentYear,
        currentMonth: form.value.currentMonth,
        currentDay: form.value.currentDay,
      },
    })
    await router.push(`/campaigns/${campaignId}/calendars/${calendarId}`)
  } catch (e: any) {
    alert(e.data?.message || 'Failed to save')
  } finally {
    submitting.value = false
  }
}
</script>
