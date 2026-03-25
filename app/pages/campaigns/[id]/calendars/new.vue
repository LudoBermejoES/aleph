<template>
  <div class="p-8 max-w-3xl">
    <div class="flex items-center gap-2 text-sm text-muted-foreground mb-4">
      <NuxtLink :to="`/campaigns/${campaignId}`" class="hover:text-primary">Campaign</NuxtLink>
      <span>/</span>
      <NuxtLink :to="`/campaigns/${campaignId}/calendars`" class="hover:text-primary">Calendars</NuxtLink>
      <span>/</span><span>New Calendar</span>
    </div>

    <h1 class="text-2xl font-bold mb-6">Create Calendar</h1>

    <form @submit.prevent="create" class="space-y-6">
      <div>
        <label class="text-sm font-medium">Calendar Name *</label>
        <input v-model="form.name" required class="w-full mt-1 px-3 py-2 rounded border border-input bg-background" placeholder="Harptos Calendar" />
      </div>

      <div class="grid grid-cols-3 gap-4">
        <div>
          <label class="text-sm font-medium">Current Year</label>
          <input v-model.number="form.currentYear" type="number" class="w-full mt-1 px-3 py-2 rounded border border-input bg-background" />
        </div>
        <div>
          <label class="text-sm font-medium">Month</label>
          <input v-model.number="form.currentMonth" type="number" min="1" class="w-full mt-1 px-3 py-2 rounded border border-input bg-background" />
        </div>
        <div>
          <label class="text-sm font-medium">Day</label>
          <input v-model.number="form.currentDay" type="number" min="1" class="w-full mt-1 px-3 py-2 rounded border border-input bg-background" />
        </div>
      </div>

      <div>
        <div class="flex items-center justify-between mb-2">
          <label class="text-sm font-medium">Months</label>
          <Button type="button" variant="outline" size="sm" @click="form.months.push({ name: '', days: 30 })">+ Add Month</Button>
        </div>
        <div v-for="(m, i) in form.months" :key="i" class="flex gap-2 mb-2">
          <input v-model="m.name" placeholder="Month name" class="flex-1 px-3 py-2 rounded border border-input bg-background" />
          <input v-model.number="m.days" type="number" min="1" placeholder="Days" class="w-24 px-3 py-2 rounded border border-input bg-background" />
          <Button type="button" variant="ghost" size="sm" @click="form.months.splice(i, 1)" class="text-red-500">Remove</Button>
        </div>
        <p v-if="!form.months.length" class="text-sm text-muted-foreground">No months defined yet.</p>
      </div>

      <div>
        <label class="text-sm font-medium">Weekday Names (comma-separated)</label>
        <input v-model="form.weekdaysRaw" class="w-full mt-1 px-3 py-2 rounded border border-input bg-background" placeholder="Sun, Mon, Tue, Wed, Thu, Fri, Sat" />
        <p class="text-xs text-muted-foreground mt-1">Leave empty for default 7-day week.</p>
      </div>

      <div class="flex justify-end gap-2">
        <NuxtLink :to="`/campaigns/${campaignId}/calendars`">
          <Button variant="outline">Cancel</Button>
        </NuxtLink>
        <Button type="submit" :disabled="creating">{{ creating ? 'Creating...' : 'Create Calendar' }}</Button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const router = useRouter()
const campaignId = route.params.id as string
const creating = ref(false)
const form = ref({
  name: '', currentYear: 1, currentMonth: 1, currentDay: 1,
  months: [{ name: '', days: 30 }] as Array<{ name: string; days: number }>,
  weekdaysRaw: '',
})

async function create() {
  creating.value = true
  try {
    const yearLength = form.value.months.reduce((sum, m) => sum + m.days, 0)
    const weekdays = form.value.weekdaysRaw.trim()
      ? form.value.weekdaysRaw.split(',').map(s => s.trim()).filter(Boolean)
      : undefined
    const res = await $fetch(`/api/campaigns/${campaignId}/calendars`, {
      method: 'POST',
      body: {
        name: form.value.name,
        configJson: { months: form.value.months, yearLength, ...(weekdays ? { weekdays } : {}) },
        currentYear: form.value.currentYear,
        currentMonth: form.value.currentMonth,
        currentDay: form.value.currentDay,
      },
    }) as any
    await router.push(`/campaigns/${campaignId}/calendars/${res.id}`)
  } catch (e: any) {
    alert(e.data?.message || 'Failed to create calendar')
  } finally {
    creating.value = false
  }
}
</script>
