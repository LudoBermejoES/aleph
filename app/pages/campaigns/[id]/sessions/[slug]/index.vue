<template>
  <div class="p-8">
    <div v-if="session">
      <div class="flex items-center gap-2 text-sm text-muted-foreground mb-4">
        <NuxtLink :to="`/campaigns/${campaignId}`" class="hover:text-primary"> {{ $t('common.campaign') }}</NuxtLink>
        <span>/</span>
        <NuxtLink :to="`/campaigns/${campaignId}/sessions`" class="hover:text-primary">{{ $t('sessions.title') }}</NuxtLink>
        <span>/</span>
        <span class="text-foreground">{{ session.title }}</span>
      </div>

      <div class="flex items-start justify-between mb-6">
        <div>
          <h1 class="text-3xl font-bold">{{ session.title }}</h1>
          <div class="flex items-center gap-2 mt-2">
            <span :class="['text-xs px-2 py-1 rounded', session.status === 'completed' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300']">{{ session.status }}</span>
            <span v-if="session.groupName" class="text-xs px-2 py-0.5 rounded bg-secondary text-secondary-foreground">{{ session.groupName }}</span>
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
          <Button v-if="canDelete" variant="destructive" size="sm" @click="deleteSession">{{ $t('common.delete') }}</Button>
        </div>
      </div>

      <!-- Attendance -->
      <div class="mb-6 p-4 rounded-lg border border-border">
        <h2 class="text-sm font-semibold mb-3">{{ $t('sessions.attendance') }}</h2>
        <div v-if="session.attendance?.length" class="space-y-2">
          <div v-for="a in (session.attendance as any[])" :key="a.id" class="flex items-center gap-3">
            <span :class="['w-2 h-2 rounded-full flex-shrink-0', a.rsvpStatus === 'accepted' ? 'bg-green-500' : a.rsvpStatus === 'declined' ? 'bg-red-500' : 'bg-yellow-500']" />
            <span class="text-sm flex-1">{{ a.userName }}</span>
            <span v-if="a.characterId" class="text-xs text-muted-foreground">{{ a.characterId }}</span>
            <label v-if="canDelete" class="flex items-center gap-1 text-xs text-muted-foreground cursor-pointer">
              <input type="checkbox" :checked="a.attended" @change="setAttended(a.userId, ($event.target as HTMLInputElement).checked)" class="rounded" />
              {{ $t('sessions.attended') }}
            </label>
          </div>
        </div>
        <p v-else class="text-xs text-muted-foreground italic">{{ $t('sessions.noAttendance') }}</p>

        <!-- Own RSVP -->
        <div class="mt-3 pt-3 border-t border-border">
          <span class="text-xs text-muted-foreground mr-2">{{ $t('sessions.yourRsvp') }}</span>
          <div class="inline-flex gap-1 mt-1">
            <button v-for="status in rsvpStatuses" :key="status.value"
              @click="setRsvp(status.value)"
              :class="['px-2 py-0.5 text-xs rounded border transition-colors', myRsvp === status.value ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:border-primary/50']">
              {{ status.label }}
            </button>
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

      <!-- Content tabs: Manual Notes / AI Notes / Summary -->
      <div class="mb-6">
        <div class="flex gap-1 mb-4 border-b border-border">
          <button v-for="tab in contentTabs" :key="tab.key"
            @click="activeContentTab = tab.key"
            :class="['px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px', activeContentTab === tab.key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground']">
            {{ tab.label }}
          </button>
        </div>
        <div v-if="contentLoading" class="text-sm text-muted-foreground">{{ $t('common.loading') }}</div>
        <div v-else>
          <div class="flex items-center justify-between mb-2">
            <span />
            <Button variant="outline" size="sm" @click="editingContent = !editingContent">
              {{ editingContent ? $t('sessions.previewTab') : $t('sessions.editTab') }}
            </Button>
          </div>
          <textarea v-if="editingContent" v-model="contentDraft[activeContentTab]" rows="12"
            :placeholder="$t('sessions.content.empty')"
            class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono" />
          <div v-else class="prose dark:prose-invert max-w-none text-foreground">
            <MDC v-if="contentDraft[activeContentTab]" :value="contentDraft[activeContentTab]" />
            <p v-else class="text-muted-foreground italic">{{ $t('sessions.content.empty') }}</p>
          </div>
          <Button v-if="editingContent" class="mt-2" @click="saveContent">{{ $t('sessions.saveLog') }}</Button>
        </div>
      </div>

      <!-- Decisions -->
      <div class="mb-6">
        <div class="flex items-center justify-between mb-3">
          <h2 class="text-lg font-semibold">{{ $t('sessions.decisions') }}</h2>
          <Button v-if="canDelete" variant="outline" size="sm" @click="showAddDecision = !showAddDecision">
            {{ $t('sessions.addDecision') }}
          </Button>
        </div>

        <!-- Add Decision form -->
        <div v-if="showAddDecision" class="mb-4 p-4 rounded-lg border border-border bg-muted/30">
          <div class="grid grid-cols-2 gap-3 mb-3">
            <div class="col-span-2">
              <label class="text-xs font-medium">{{ $t('sessions.decisionTitle') }} *</label>
              <input v-model="newDecision.title" type="text" class="w-full mt-1 px-2 py-1.5 text-sm rounded border border-input bg-background" :placeholder="$t('sessions.decisionTitlePlaceholder')" />
            </div>
            <div>
              <label class="text-xs font-medium">{{ $t('sessions.decisionType') }}</label>
              <select v-model="newDecision.type" class="w-full mt-1 px-2 py-1.5 text-sm rounded border border-input bg-background">
                <option value="choice">{{ $t('sessions.decisionTypeChoice') }}</option>
                <option value="role">{{ $t('sessions.decisionTypeRole') }}</option>
                <option value="count">{{ $t('sessions.decisionTypeCount') }}</option>
                <option value="destiny">{{ $t('sessions.decisionTypeDestiny') }}</option>
              </select>
            </div>
            <div>
              <label class="text-xs font-medium">{{ $t('common.description') }}</label>
              <input v-model="newDecision.description" type="text" class="w-full mt-1 px-2 py-1.5 text-sm rounded border border-input bg-background" />
            </div>
          </div>
          <div class="flex gap-2">
            <Button size="sm" @click="submitDecision" :disabled="!newDecision.title.trim()">{{ $t('common.save') }}</Button>
            <Button size="sm" variant="outline" @click="showAddDecision = false">{{ $t('common.cancel') }}</Button>
          </div>
        </div>

        <div v-if="decisions.length" class="relative border-l-2 border-border ml-4 pl-6 space-y-4">
          <div v-for="d in decisions" :key="d.id" class="relative">
            <div class="absolute -left-[31px] w-4 h-4 rounded-full border-2 border-border bg-background" />
            <div class="p-3 rounded border border-border">
              <div class="flex items-center gap-2 mb-1">
                <span class="font-medium text-sm">{{ d.title }}</span>
                <span class="text-xs px-2 py-0.5 rounded bg-secondary text-secondary-foreground">{{ d.type }}</span>
              </div>
              <p v-if="d.description" class="text-xs text-muted-foreground mb-2">{{ d.description }}</p>

              <!-- Consequences -->
              <div v-if="(d as any).consequences?.length" class="mb-2 space-y-1">
                <div v-for="c in (d as any).consequences" :key="c.id" class="flex items-start gap-2 text-xs pl-3 border-l border-border">
                  <span :class="(c.revealed || canDelete) ? 'text-foreground' : 'text-muted-foreground italic'">
                    {{ c.revealed ? c.description : canDelete ? `[${$t('sessions.hiddenLabel')}] ${c.description}` : $t('sessions.hiddenConsequence') }}
                  </span>
                  <button v-if="canDelete" @click="toggleConsequence(d, c)"
                    :class="['ml-auto flex-shrink-0 text-xs px-1.5 py-0.5 rounded border transition-colors', c.revealed ? 'border-green-500 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20' : 'border-border text-muted-foreground hover:border-primary/50']">
                    {{ c.revealed ? $t('sessions.hide') : $t('sessions.reveal') }}
                  </button>
                </div>
              </div>

              <!-- Add Consequence -->
              <div v-if="canDelete">
                <button v-if="addingConsequenceFor !== d.id" @click="addingConsequenceFor = d.id"
                  class="text-xs text-muted-foreground hover:text-foreground transition-colors">
                  + {{ $t('sessions.addConsequence') }}
                </button>
                <div v-else class="mt-2 p-2 rounded border border-border bg-muted/30">
                  <input v-model="newConsequence.description" type="text" class="w-full px-2 py-1 text-xs rounded border border-input bg-background mb-2"
                    :placeholder="$t('sessions.consequencePlaceholder')" />
                  <div class="flex items-center gap-3">
                    <label class="flex items-center gap-1 text-xs">
                      <input type="checkbox" v-model="newConsequence.revealed" class="rounded" />
                      {{ $t('sessions.revealedByDefault') }}
                    </label>
                    <Button size="sm" @click="submitConsequence(d)" :disabled="!newConsequence.description.trim()">{{ $t('common.save') }}</Button>
                    <Button size="sm" variant="outline" @click="addingConsequenceFor = null">{{ $t('common.cancel') }}</Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <p v-else class="text-sm text-muted-foreground italic">{{ $t('sessions.noDecisions') }}</p>
      </div>

      <!-- Rolls (collapsible) -->
      <div class="mb-6">
        <button @click="toggleRolls" class="flex items-center gap-2 w-full text-left">
          <h2 class="text-lg font-semibold">{{ $t('sessions.rolls') }}</h2>
          <component :is="rollsOpen ? ICONS.chevronUp : ICONS.chevronDown" class="w-4 h-4 text-muted-foreground" />
        </button>
        <div v-if="rollsOpen" class="mt-3">
          <div v-if="rollsLoading" class="text-sm text-muted-foreground">{{ $t('common.loading') }}</div>
          <div v-else-if="rolls.length" class="overflow-x-auto">
            <table class="w-full text-xs">
              <thead>
                <tr class="border-b border-border text-muted-foreground">
                  <th class="text-left py-1.5 pr-3">{{ $t('sessions.rollUser') }}</th>
                  <th class="text-left py-1.5 pr-3">{{ $t('sessions.rollFormula') }}</th>
                  <th class="text-right py-1.5 pr-3">{{ $t('sessions.rollTotal') }}</th>
                  <th class="text-right py-1.5">{{ $t('common.date') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="r in rolls" :key="r.id" class="border-b border-border/50">
                  <td class="py-1.5 pr-3">{{ r.userName }}</td>
                  <td class="py-1.5 pr-3 font-mono">{{ r.formula }}</td>
                  <td class="py-1.5 pr-3 text-right font-bold">{{ r.total }}</td>
                  <td class="py-1.5 text-right text-muted-foreground">{{ new Date(r.createdAt).toLocaleTimeString() }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p v-else class="text-sm text-muted-foreground italic">{{ $t('sessions.noRolls') }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ICONS } from '~/utils/icons'

const route = useRoute()
const campaignId = route.params.id as string
const slug = route.params.slug as string
const { t } = useI18n()
import type { GameSession, SessionDecision } from '~/types/api'

const session = ref<GameSession | null>(null)
const decisions = ref<SessionDecision[]>([])
const editing = ref(false)
const logContent = ref('')
const canDelete = ref(false)
const myRsvp = ref('pending')
const api = useCampaignApi(campaignId)

// Content tabs
const contentTabs = [
  { key: 'manual_notes', label: t('sessions.content.manualNotes') },
  { key: 'ai_notes', label: t('sessions.content.aiNotes') },
  { key: 'summary', label: t('sessions.content.summary') },
]
const activeContentTab = ref('manual_notes')
const editingContent = ref(false)
const contentLoading = ref(false)
const contentDraft = ref<Record<string, string>>({ manual_notes: '', ai_notes: '', summary: '' })

// Decisions
const showAddDecision = ref(false)
const newDecision = ref({ title: '', type: 'choice', description: '' })
const addingConsequenceFor = ref<string | null>(null)
const newConsequence = ref({ description: '', revealed: false })

// Rolls
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
  const [sessionData, campaignData] = await Promise.all([
    api.getSession(slug).catch(() => null),
    api.getCampaign().catch(() => null),
  ])
  session.value = sessionData
  logContent.value = session.value?.logContent || ''
  canDelete.value = ['dm', 'co_dm'].includes((campaignData as any)?.role ?? '')
  decisions.value = await api.getSessionDecisions(slug).catch(() => [])
  await loadContent()
}

async function deleteSession() {
  if (!confirm(t('sessions.confirmDelete'))) return
  try {
    await api.deleteSession(slug)
    navigateTo(`/campaigns/${campaignId}/sessions`)
  } catch (e: any) { alert(e.data?.message || t('errors.failedSave')) }
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
    // no content yet
  } finally {
    contentLoading.value = false
  }
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

async function saveContent() {
  try {
    await api.updateSessionContent(slug, activeContentTab.value, contentDraft.value[activeContentTab.value])
    editingContent.value = false
  } catch (e: any) { alert(e.data?.message || t('errors.failedSave')) }
}

async function setRsvp(status: string) {
  try {
    await api.patchAttendance(slug, { rsvpStatus: status })
    myRsvp.value = status
    await load()
  } catch (e: any) { alert(e.data?.message || t('errors.failedSave')) }
}

async function setAttended(userId: string, attended: boolean) {
  try {
    await api.patchAttendance(slug, { userId, attended })
    await load()
  } catch (e: any) { alert(e.data?.message || t('errors.failedSave')) }
}

async function submitDecision() {
  try {
    await api.createDecision(slug, { title: newDecision.value.title, type: newDecision.value.type, description: newDecision.value.description || undefined })
    newDecision.value = { title: '', type: 'choice', description: '' }
    showAddDecision.value = false
    decisions.value = await api.getSessionDecisions(slug)
  } catch (e: any) { alert(e.data?.message || t('errors.failedSave')) }
}

async function submitConsequence(decision: any) {
  try {
    await api.createConsequence(slug, decision.id, { description: newConsequence.value.description, revealed: newConsequence.value.revealed })
    newConsequence.value = { description: '', revealed: false }
    addingConsequenceFor.value = null
    decisions.value = await api.getSessionDecisions(slug)
  } catch (e: any) { alert(e.data?.message || t('errors.failedSave')) }
}

async function toggleConsequence(decision: any, consequence: any) {
  try {
    await api.revealConsequence(slug, decision.id, consequence.id, !consequence.revealed)
    decisions.value = await api.getSessionDecisions(slug)
  } catch (e: any) { alert(e.data?.message || t('errors.failedSave')) }
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
