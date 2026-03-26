<template>
  <div class="p-8">
    <div v-if="session">
      <div class="flex items-center gap-2 text-sm text-muted-foreground mb-4">
        <NuxtLink :to="`/campaigns/${campaignId}`" class="hover:text-primary">Campaign</NuxtLink>
        <span>/</span>
        <NuxtLink :to="`/campaigns/${campaignId}/sessions`" class="hover:text-primary">{{ $t('sessions.title') }}</NuxtLink>
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
          <NuxtLink :to="`/campaigns/${campaignId}/sessions/${slug}/edit`">
            <Button variant="outline" size="sm">{{ $t('common.edit') }}</Button>
          </NuxtLink>
          <select @change="updateStatus(($event.target as HTMLSelectElement).value)" :value="session.status"
            class="rounded-md border border-input bg-background px-2 py-1 text-sm">
            <option value="planned">{{ $t('sessions.statusPlanned') }}</option>
            <option value="active">{{ $t('sessions.statusActive') }}</option>
            <option value="completed">{{ $t('sessions.statusCompleted') }}</option>
            <option value="cancelled">{{ $t('sessions.statusCancelled') }}</option>
          </select>
        </div>
      </div>

      <!-- Attendance -->
      <div v-if="session.attendance?.length" class="mb-6 p-4 rounded-lg border border-border">
        <h2 class="text-sm font-semibold mb-2">{{ $t('sessions.attendance') }}</h2>
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
          <h2 class="text-lg font-semibold">{{ $t('sessions.log') }}</h2>
          <Button variant="outline" size="sm" @click="editing = !editing">{{ editing ? $t('sessions.previewTab') : $t('sessions.editTab') }}</Button>
        </div>
        <textarea v-if="editing" v-model="logContent" rows="15" class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono" />
        <div v-else class="prose dark:prose-invert max-w-none text-foreground">
          <MDC v-if="session.logContent" :value="session.logContent" />
          <p v-else class="text-muted-foreground italic">{{ $t('sessions.noLog') }}</p>
        </div>
        <Button v-if="editing" class="mt-2" @click="saveLog">{{ $t('sessions.saveLog') }}</Button>
      </div>

      <!-- Decision Timeline -->
      <div v-if="decisions.length" class="mb-6">
        <h2 class="text-lg font-semibold mb-3">{{ $t('sessions.decisions') }}</h2>
        <div class="relative border-l-2 border-border ml-4 pl-6 space-y-4">
          <div v-for="d in decisions" :key="d.id" class="relative">
            <div class="absolute -left-[31px] w-4 h-4 rounded-full border-2 border-border bg-background" />
            <div class="p-3 rounded border border-border">
              <div class="flex items-center gap-2 mb-1">
                <span class="font-medium text-sm">{{ d.title }}</span>
                <span class="text-xs px-2 py-0.5 rounded bg-secondary text-secondary-foreground">{{ d.type }}</span>
              </div>
              <p v-if="d.description" class="text-xs text-muted-foreground">{{ d.description }}</p>
              <div v-if="d.consequences?.length" class="mt-2 space-y-1">
                <div v-for="c in d.consequences" :key="c.id" class="text-xs pl-3 border-l border-border">
                  <span :class="c.revealed ? 'text-foreground' : 'text-muted-foreground italic'">
                    {{ c.revealed ? c.description : $t('sessions.hiddenConsequence') }}
                  </span>
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
const { t } = useI18n()
import type { GameSession, SessionDecision } from '~/types/api'

const session = ref<GameSession | null>(null)
const decisions = ref<SessionDecision[]>([])
const editing = ref(false)
const logContent = ref('')
const api = useCampaignApi(campaignId)

async function load() {
  session.value = await api.getSession(slug).catch(() => null)
  logContent.value = session.value?.logContent || ''
  decisions.value = await api.getSessionDecisions(slug).catch(() => [])
}

async function updateStatus(status: string) {
  try {
    await api.updateSession(slug, { status })
    await load()
  } catch (e: any) { alert(e.data?.message || t('errors.failedSave')) }
}

async function saveLog() {
  try {
    await api.updateSession(slug, { content: logContent.value })
    await load()
    editing.value = false
  } catch (e: any) { alert(e.data?.message || t('errors.failedSave')) }
}

onMounted(load)
</script>
