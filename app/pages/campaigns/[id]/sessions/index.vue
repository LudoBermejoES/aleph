<template>
  <div class="p-8">
    <div class="flex items-center gap-2 text-sm text-muted-foreground mb-1">
      <NuxtLink :to="`/campaigns/${campaignId}`" class="hover:text-primary">Campaign</NuxtLink>
      <span>/</span>
      <span>Sessions</span>
    </div>

    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold">Sessions</h1>
      <NuxtLink :to="`/campaigns/${campaignId}/sessions/new`">
        <Button data-testid="new-session-btn">New Session</Button>
      </NuxtLink>
    </div>

    <!-- Upcoming -->
    <div v-if="upcoming.length" class="mb-8">
      <h2 class="text-lg font-semibold mb-3">Upcoming</h2>
      <div class="space-y-2">
        <NuxtLink v-for="s in upcoming" :key="s.id" :to="`/campaigns/${campaignId}/sessions/${s.slug}`"
          class="block p-4 rounded-lg border border-border hover:border-primary/50 transition-colors">
          <div class="flex items-center justify-between">
            <span class="font-medium">#{{ s.sessionNumber }} {{ s.title }}</span>
            <span class="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">{{ s.status }}</span>
          </div>
          <span v-if="s.scheduledDate" class="text-xs text-muted-foreground">{{ new Date(s.scheduledDate).toLocaleDateString() }}</span>
        </NuxtLink>
      </div>
    </div>

    <!-- Past -->
    <div v-if="past.length">
      <h2 class="text-lg font-semibold mb-3">Past Sessions</h2>
      <div class="space-y-2">
        <NuxtLink v-for="s in past" :key="s.id" :to="`/campaigns/${campaignId}/sessions/${s.slug}`"
          class="block p-4 rounded-lg border border-border hover:border-primary/50 transition-colors">
          <div class="flex items-center justify-between">
            <span class="font-medium">#{{ s.sessionNumber }} {{ s.title }}</span>
            <span class="text-xs px-2 py-0.5 rounded bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">{{ s.status }}</span>
          </div>
        </NuxtLink>
      </div>
    </div>

    <p v-if="!upcoming.length && !past.length" class="text-muted-foreground text-center py-8">No sessions yet.</p>
  </div>
</template>

<script setup lang="ts">

const route = useRoute()
const campaignId = route.params.id as string
const sessions = ref<any[]>([])

const upcoming = computed(() => sessions.value.filter(s => ['planned', 'active'].includes(s.status)))
const past = computed(() => sessions.value.filter(s => ['completed', 'cancelled'].includes(s.status)))

async function load() {
  try { sessions.value = await $fetch(`/api/campaigns/${campaignId}/sessions`) as any[] } catch { sessions.value = [] }
}

onMounted(load)
</script>
