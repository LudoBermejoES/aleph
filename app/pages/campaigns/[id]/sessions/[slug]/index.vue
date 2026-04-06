<template>
  <div class="p-8">
    <LoadingSkeleton v-if="loading" :rows="4" />
    <ErrorToast v-if="error" :message="error" @dismiss="error = null" />
    <div v-else-if="session">
      <div class="flex items-center gap-2 text-sm text-muted-foreground mb-4">
        <NuxtLink :to="`/campaigns/${campaignId}`" class="hover:text-primary">
          {{ $t('common.campaign') }}</NuxtLink
        >
        <span>/</span>
        <NuxtLink :to="`/campaigns/${campaignId}/sessions`" class="hover:text-primary">{{
          $t('sessions.title')
        }}</NuxtLink>
        <span>/</span>
        <span class="text-foreground">{{ session.title }}</span>
      </div>

      <div class="flex items-start justify-between mb-6">
        <div>
          <h1 class="text-3xl font-bold">{{ session.title }}</h1>
          <div class="flex items-center gap-2 mt-2">
            <span
              :class="[
                'text-xs px-2 py-1 rounded',
                session.status === 'completed'
                  ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                  : 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
              ]"
              >{{ session.status }}</span
            >
            <span
              v-if="session.groupName"
              class="text-xs px-2 py-0.5 rounded bg-secondary text-secondary-foreground"
              >{{ session.groupName }}</span
            >
            <span v-if="session.scheduledDate" class="text-xs text-muted-foreground">{{
              new Date(session.scheduledDate).toLocaleString()
            }}</span>
          </div>
        </div>
        <div class="flex gap-2">
          <NuxtLink :to="`/campaigns/${campaignId}/sessions/${slug}/edit`">
            <Button variant="outline" size="sm">{{ $t('common.edit') }}</Button>
          </NuxtLink>
          <NuxtLink
            v-if="canDelete"
            :to="`/campaigns/${campaignId}/sessions/${slug}/edit?collab=true`"
          >
            <Button variant="outline" size="sm">{{ $t('collaboration.collaborate') }}</Button>
          </NuxtLink>
          <select
            :value="session.status"
            class="rounded-md border border-input bg-background px-2 py-1 text-sm"
            :aria-label="$t('aria.filters.sessionStatus')"
            @change="updateStatus(($event.target as HTMLSelectElement).value)"
          >
            <option value="planned">{{ $t('sessions.statusPlanned') }}</option>
            <option value="active">{{ $t('sessions.statusActive') }}</option>
            <option value="completed">{{ $t('sessions.statusCompleted') }}</option>
            <option value="cancelled">{{ $t('sessions.statusCancelled') }}</option>
          </select>
          <Button v-if="canDelete" variant="destructive" size="sm" @click="deleteSession">{{
            $t('common.delete')
          }}</Button>
        </div>
      </div>

      <SessionAttendancePanel
        :attendance="(session.attendance as any[]) ?? []"
        :can-manage="canDelete"
        :my-rsvp="myRsvp"
        :rsvp-statuses="rsvpStatuses"
        @set-rsvp="setRsvp"
        @set-attended="setAttended"
      />

      <!-- Session Log -->
      <div class="mb-6">
        <div class="flex items-center justify-between mb-3">
          <h2 class="text-lg font-semibold">{{ $t('sessions.log') }}</h2>
          <Button variant="outline" size="sm" @click="editing = !editing">{{
            editing ? $t('sessions.previewTab') : $t('sessions.editTab')
          }}</Button>
        </div>
        <textarea
          v-if="editing"
          v-model="logContent"
          rows="15"
          class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
        />
        <div v-else class="prose dark:prose-invert max-w-none text-foreground">
          <MDC v-if="session.logContent" :value="session.logContent" />
          <p v-else class="text-muted-foreground italic">{{ $t('sessions.noLog') }}</p>
        </div>
        <Button v-if="editing" class="mt-2" @click="saveLog">{{ $t('sessions.saveLog') }}</Button>
      </div>

      <SessionContentTabs
        ref="contentTabsRef"
        :tabs="contentTabs"
        :content-draft="contentDraft"
        :loading="contentLoading"
        :can-generate="canGenerate"
        @save="saveContent"
        @generate="generateContent"
      />

      <SessionDecisionsList
        :decisions="decisions"
        :can-manage="canDelete"
        @add-decision="submitDecision"
        @add-consequence="submitConsequence"
        @toggle-consequence="toggleConsequence"
      />

      <SessionRollsTable
        :rolls="rolls"
        :loading="rollsLoading"
        :open="rollsOpen"
        @toggle="toggleRolls"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { GameSession, SessionDecision } from '~/types/api'

const route = useRoute()
const campaignId = route.params.id as string
const slug = route.params.slug as string
const { t } = useI18n()

const session = ref<GameSession | null>(null)
const decisions = ref<SessionDecision[]>([])
const editing = ref(false)
const logContent = ref('')
const canDelete = ref(false)
const canGenerate = ref(false)
const myRsvp = ref('pending')
const api = useCampaignApi(campaignId)
const { loading, error, withLoading } = useLoadingState()
const contentTabsRef = ref<any>(null)

const contentTabs = [
  { key: 'manual_notes', label: t('sessions.content.manualNotes') },
  { key: 'ai_notes', label: t('sessions.content.aiNotes') },
  { key: 'summary', label: t('sessions.content.summary') },
]
const contentLoading = ref(false)
const contentDraft = ref<Record<string, string>>({ manual_notes: '', ai_notes: '', summary: '' })

const rollsOpen = ref(false)
const rollsLoading = ref(false)
const rolls = ref<any[]>([])

const rsvpStatuses = [
  { value: 'pending', label: t('sessions.rsvpPending') },
  { value: 'accepted', label: t('sessions.rsvpAccepted') },
  { value: 'declined', label: t('sessions.rsvpDeclined') },
  { value: 'tentative', label: t('sessions.rsvpTentative') },
]

async function load() {
  await withLoading(async () => {
    const [sessionData, campaignData] = await Promise.all([
      api.getSession(slug).catch(() => null),
      api.getCampaign().catch(() => null),
    ])
    session.value = sessionData
    logContent.value = session.value?.logContent || ''
    const role = (campaignData as any)?.role ?? ''
    canDelete.value = ['dm', 'co_dm'].includes(role)
    canGenerate.value = ['dm', 'co_dm', 'editor'].includes(role)
    decisions.value = await api.getSessionDecisions(slug).catch(() => [])
    await loadContent()
  })
}

async function loadContent() {
  contentLoading.value = true
  try {
    const data = await api.getSessionContent(slug)
    contentDraft.value = {
      manual_notes: (data.manual_notes as string) || '',
      ai_notes: (data.ai_notes as string) || '',
      summary: (data.summary as string) || '',
    }
  } catch {
    /* no content yet */
  } finally {
    contentLoading.value = false
  }
}

async function deleteSession() {
  if (!confirm(t('sessions.confirmDelete'))) return
  try {
    await api.deleteSession(slug)
    navigateTo(`/campaigns/${campaignId}/sessions`)
  } catch (e: any) {
    alert(e.data?.message || t('errors.failedSave'))
  }
}

async function updateStatus(status: string) {
  try {
    await api.updateSession(slug, { status })
    await load()
  } catch (e: any) {
    alert(e.data?.message || t('errors.failedSave'))
  }
}

async function saveLog() {
  try {
    await api.updateSession(slug, { content: logContent.value })
    await load()
    editing.value = false
  } catch (e: any) {
    alert(e.data?.message || t('errors.failedSave'))
  }
}

async function saveContent(tabKey: string, content: string) {
  try {
    await api.updateSessionContent(slug, tabKey, content)
  } catch (e: any) {
    alert(e.data?.message || t('errors.failedSave'))
  }
}

async function generateContent(target: string) {
  contentTabsRef.value?.setGenerating(true)
  try {
    const result = (await $fetch(`/api/campaigns/${campaignId}/sessions/${slug}/generate`, {
      method: 'POST',
      body: { target },
    })) as { target: string; content: string }
    contentDraft.value[result.target] = result.content
    contentTabsRef.value?.updateDraft(result.target, result.content)
    alert(t('sessions.content.generateSuccess'))
  } catch (e: any) {
    const status = e?.statusCode ?? e?.response?.status
    if (status === 503) {
      contentTabsRef.value?.setAiUnavailable(true)
      alert(t('sessions.content.aiNotConfigured'))
    } else if (status === 429) {
      alert(t('sessions.content.cooldownError'))
    } else if (status === 400) {
      alert(t('sessions.content.noManualNotes'))
    } else {
      alert(t('sessions.content.generateError'))
    }
  } finally {
    contentTabsRef.value?.setGenerating(false)
  }
}

async function setRsvp(status: string) {
  try {
    await api.patchAttendance(slug, { rsvpStatus: status })
    myRsvp.value = status
    await load()
  } catch (e: any) {
    alert(e.data?.message || t('errors.failedSave'))
  }
}

async function setAttended(userId: string, attended: boolean) {
  try {
    await api.patchAttendance(slug, { userId, attended })
    await load()
  } catch (e: any) {
    alert(e.data?.message || t('errors.failedSave'))
  }
}

async function submitDecision(data: { title: string; type: string; description?: string }) {
  try {
    await api.createDecision(slug, data)
    decisions.value = await api.getSessionDecisions(slug)
  } catch (e: any) {
    alert(e.data?.message || t('errors.failedSave'))
  }
}

async function submitConsequence(
  decisionId: string,
  data: { description: string; revealed: boolean },
) {
  try {
    await api.createConsequence(slug, decisionId, data)
    decisions.value = await api.getSessionDecisions(slug)
  } catch (e: any) {
    alert(e.data?.message || t('errors.failedSave'))
  }
}

async function toggleConsequence(decisionId: string, consequenceId: string, revealed: boolean) {
  try {
    await api.revealConsequence(slug, decisionId, consequenceId, revealed)
    decisions.value = await api.getSessionDecisions(slug)
  } catch (e: any) {
    alert(e.data?.message || t('errors.failedSave'))
  }
}

async function toggleRolls() {
  rollsOpen.value = !rollsOpen.value
  if (rollsOpen.value && !rolls.value.length) {
    rollsLoading.value = true
    try {
      rolls.value = await api.getSessionRolls(slug)
    } catch {
      rolls.value = []
    } finally {
      rollsLoading.value = false
    }
  }
}

onMounted(load)
</script>
