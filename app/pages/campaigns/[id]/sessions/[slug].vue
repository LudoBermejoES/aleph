<template>
  <div class="p-8">
    <div v-if="session">
      <div class="flex items-center gap-2 text-sm text-muted-foreground mb-4">
        <NuxtLink :to="`/campaigns/${campaignId}`" class="hover:text-primary">Campaign</NuxtLink>
        <span>/</span>
        <NuxtLink :to="`/campaigns/${campaignId}/sessions`" class="hover:text-primary">Sessions</NuxtLink>
        <span>/</span>
        <span class="text-foreground">#{{ session.sessionNumber }}</span>
      </div>

      <div class="flex items-start justify-between mb-6">
        <div>
          <h1 class="text-3xl font-bold">#{{ session.sessionNumber }} {{ session.title }}</h1>
          <div class="flex items-center gap-2 mt-2">
            <span :class="['text-xs px-2 py-1 rounded', session.status === 'completed' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300']">{{ session.status }}</span>
            <span v-if="session.scheduledDate" class="text-xs text-muted-foreground">{{ new Date(session.scheduledDate).toLocaleString() }}</span>
          </div>
        </div>
        <div class="flex gap-2">
          <select @change="updateStatus(($event.target as HTMLSelectElement).value)" :value="session.status"
            class="rounded-md border border-input bg-background px-2 py-1 text-sm">
            <option value="planned">Planned</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      <!-- Attendance -->
      <div v-if="session.attendance?.length" class="mb-6 p-4 rounded-lg border border-border">
        <h2 class="text-sm font-semibold mb-2">Attendance</h2>
        <div class="flex gap-4">
          <div v-for="a in session.attendance" :key="a.id" class="flex items-center gap-1">
            <span :class="['w-2 h-2 rounded-full', a.rsvpStatus === 'accepted' ? 'bg-green-500' : a.rsvpStatus === 'declined' ? 'bg-red-500' : 'bg-yellow-500']" />
            <span class="text-sm">{{ a.userName }}</span>
          </div>
        </div>
      </div>

      <!-- Session Log -->
      <div class="mb-6">
        <div class="flex items-center justify-between mb-3">
          <h2 class="text-lg font-semibold">Session Log</h2>
          <Button variant="outline" size="sm" @click="editing = !editing">{{ editing ? 'Preview' : 'Edit' }}</Button>
        </div>
        <textarea v-if="editing" v-model="logContent" rows="15" class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono" />
        <div v-else class="prose dark:prose-invert max-w-none">
          <MDC v-if="session.logContent" :value="session.logContent" />
          <p v-else class="text-muted-foreground italic">No session log yet.</p>
        </div>
        <Button v-if="editing" class="mt-2" @click="saveLog">Save Log</Button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Button } from '~/components/ui/button'

const route = useRoute()
const campaignId = route.params.id as string
const slug = route.params.slug as string
const session = ref<any>(null)
const editing = ref(false)
const logContent = ref('')

async function load() {
  try {
    session.value = await $fetch(`/api/campaigns/${campaignId}/sessions/${slug}`)
    logContent.value = session.value?.logContent || ''
  } catch { session.value = null }
}

async function updateStatus(status: string) {
  try {
    await $fetch(`/api/campaigns/${campaignId}/sessions/${slug}`, { method: 'PUT', body: { status } })
    await load()
  } catch (e: any) { alert(e.data?.message || 'Failed') }
}

async function saveLog() {
  try {
    await $fetch(`/api/campaigns/${campaignId}/sessions/${slug}`, { method: 'PUT', body: { content: logContent.value } })
    await load()
    editing.value = false
  } catch (e: any) { alert(e.data?.message || 'Failed') }
}

onMounted(load)
</script>
