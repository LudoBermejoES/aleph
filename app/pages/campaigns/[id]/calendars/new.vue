<template>
  <div class="p-8 max-w-3xl">
    <div class="flex items-center gap-2 text-sm text-muted-foreground mb-4">
      <NuxtLink :to="`/campaigns/${campaignId}`" class="hover:text-primary">Campaign</NuxtLink>
      <span>/</span>
      <NuxtLink :to="`/campaigns/${campaignId}/calendars`" class="hover:text-primary">{{ $t('calendars.title') }}</NuxtLink>
      <span>/</span><span>{{ $t('calendars.newCalendar') }}</span>
    </div>
    <h1 class="text-2xl font-bold mb-6">{{ $t('calendars.newCalendar') }}</h1>
    <CalendarForm v-model="form" :submit-label="$t('common.create')" :submitting="submitting" @submit="create">
      <template #cancel>
        <NuxtLink :to="`/campaigns/${campaignId}/calendars`"><Button variant="outline">{{ $t('common.cancel') }}</Button></NuxtLink>
      </template>
    </CalendarForm>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const router = useRouter()
const campaignId = route.params.id as string
const submitting = ref(false)
const { t } = useI18n()
const form = ref({
  name: '', currentYear: 1, currentMonth: 1, currentDay: 1,
  months: [{ name: '', days: 30 }] as Array<{ name: string; days: number }>,
  weekdaysRaw: '',
})

async function create() {
  submitting.value = true
  try {
    const yearLength = form.value.months.reduce((sum, m) => sum + m.days, 0)
    const weekdays = form.value.weekdaysRaw.trim()
      ? form.value.weekdaysRaw.split(',').map(s => s.trim()).filter(Boolean)
      : undefined
    const api = useCampaignApi(campaignId)
    const res = await api.createCalendar({
      name: form.value.name,
      configJson: { months: form.value.months, yearLength, ...(weekdays ? { weekdays } : {}) },
      currentYear: form.value.currentYear,
      currentMonth: form.value.currentMonth,
      currentDay: form.value.currentDay,
    })
    await router.push(`/campaigns/${campaignId}/calendars/${res.id}`)
  } catch (e: any) {
    alert(e.data?.message || t('calendars.failedSave'))
  } finally {
    submitting.value = false
  }
}
</script>
