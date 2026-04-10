<template>
  <div class="p-8">
    <div class="flex items-center gap-2 text-sm text-muted-foreground mb-1">
      <NuxtLink :to="`/campaigns/${campaignId}`" class="hover:text-primary">
        {{ $t('common.campaign') }}</NuxtLink
      >
      <span>/</span>
      <span>{{ $t('members.title') }}</span>
    </div>

    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold">{{ $t('members.title') }}</h1>
      <Dialog v-model:open="showInviteDialog">
        <DialogTrigger as-child>
          <Button size="sm">{{ $t('members.invite') }}</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{{ $t('members.invite') }}</DialogTitle>
            <DialogDescription>{{ $t('members.inviteDescription') }}</DialogDescription>
          </DialogHeader>
          <div class="space-y-4">
            <div class="space-y-2">
              <label class="text-sm font-medium">{{ $t('members.role') }}</label>
              <select
                v-model="inviteRole"
                class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="player">{{ $t('members.player') }}</option>
                <option value="editor">{{ $t('members.editor') }}</option>
                <option value="co_dm">{{ $t('members.coDm') }}</option>
              </select>
            </div>
            <Button :disabled="inviting" @click="generateInvite">
              {{ inviting ? $t('members.generating') : $t('members.generateLink') }}
            </Button>
            <div v-if="inviteUrl" class="p-3 bg-muted rounded text-sm">
              <p class="text-xs text-muted-foreground mb-2">{{ $t('members.shareLink') }}</p>
              <div class="flex items-center gap-2">
                <code class="flex-1 break-all text-xs">{{ inviteUrl }}</code>
                <button
                  class="flex-shrink-0 text-xs px-2 py-1 rounded border border-border hover:border-primary/50 transition-colors"
                  @click="copyInviteUrl"
                >
                  {{ copyFeedback ? $t('members.copied') : $t('members.copy') }}
                </button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>

    <!-- Add existing user (co-DM+ only) -->
    <div v-if="canManageMembers" class="mb-6 p-4 rounded-lg border border-border space-y-3">
      <h2 class="text-sm font-semibold">{{ $t('members.addExisting') }}</h2>
      <div class="relative">
        <input
          v-model="searchQuery"
          type="text"
          :placeholder="$t('members.searchPlaceholder')"
          class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          @input="onSearchInput"
        />
        <ul
          v-if="searchResults.length > 0"
          class="absolute z-10 mt-1 w-full rounded-md border border-border bg-background shadow-md"
        >
          <li
            v-for="u in searchResults"
            :key="u.id"
            class="flex items-center justify-between px-3 py-2 text-sm cursor-pointer hover:bg-muted"
            @click="selectUser(u)"
          >
            <span class="font-medium">{{ u.name }}</span>
            <span class="text-xs text-muted-foreground">{{ u.email }}</span>
          </li>
        </ul>
      </div>

      <div v-if="selectedUser" class="flex items-center gap-3">
        <span class="text-sm font-medium flex-1">{{ selectedUser.name }}</span>
        <select
          v-model="directRole"
          class="rounded-md border border-input bg-background px-2 py-1 text-sm"
        >
          <option value="visitor">{{ $t('members.visitor') }}</option>
          <option value="player">{{ $t('members.player') }}</option>
          <option value="editor">{{ $t('members.editor') }}</option>
          <option value="co_dm">{{ $t('members.coDm') }}</option>
        </select>
        <Button size="sm" :disabled="addingMember" @click="addExistingUser">
          {{ addingMember ? $t('common.saving') : $t('members.addUser') }}
        </Button>
        <button class="text-xs text-muted-foreground hover:underline" @click="clearSelection">
          {{ $t('common.cancel') }}
        </button>
      </div>

      <p v-if="addError" class="text-xs text-destructive">{{ addError }}</p>
    </div>

    <div class="space-y-2">
      <div
        v-for="member in members"
        :key="member.id"
        class="flex items-center justify-between p-4 rounded-lg border border-border"
      >
        <div>
          <span class="font-medium">{{ member.name }}</span>
          <span class="text-sm text-muted-foreground ml-2">{{ member.email }}</span>
        </div>
        <div class="flex items-center gap-3">
          <select
            :value="member.role"
            class="rounded-md border border-input bg-background px-2 py-1 text-sm"
            :disabled="member.role === 'dm'"
            :aria-label="$t('aria.filters.memberRole')"
            @change="changeRole(member.userId, ($event.target as HTMLSelectElement).value)"
          >
            <option value="dm" disabled>{{ $t('members.dm') }}</option>
            <option value="co_dm">{{ $t('members.coDm') }}</option>
            <option value="editor">{{ $t('members.editor') }}</option>
            <option value="player">{{ $t('members.player') }}</option>
            <option value="visitor">{{ $t('members.visitor') }}</option>
          </select>
          <button
            v-if="member.role !== 'dm'"
            class="text-xs text-destructive hover:underline"
            @click="removeMember(member.userId)"
          >
            {{ $t('members.remove') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { searchUsers } from '~/composables/useCampaignApi'

const route = useRoute()
const campaignId = route.params.id as string
const api = useCampaignApi(campaignId)
const { t } = useI18n()

const members = ref<{ userId: string; name: string; email: string; role: string }[]>([])
const myRole = ref<string>('')
const canManageMembers = computed(() => ['dm', 'co_dm'].includes(myRole.value))

const showInviteDialog = ref(false)
const inviteRole = ref('player')
const inviting = ref(false)
const inviteToken = ref('')
const inviteUrl = ref('')
const copyFeedback = ref(false)

// Direct add state
const searchQuery = ref('')
const searchResults = ref<{ id: string; name: string; email: string }[]>([])
const selectedUser = ref<{ id: string; name: string; email: string } | null>(null)
const directRole = ref('player')
const addingMember = ref(false)
const addError = ref('')
let searchTimeout: ReturnType<typeof setTimeout> | null = null

async function loadMembers() {
  try {
    members.value = await api.getMembers()
  } catch {
    members.value = []
  }
}

async function loadMyRole() {
  try {
    const campaign = await api.getCampaign()
    myRole.value = (campaign as unknown as { role: string }).role ?? ''
  } catch {
    myRole.value = ''
  }
}

async function generateInvite() {
  inviting.value = true
  inviteToken.value = ''
  try {
    const result = await api.createInvite({ role: inviteRole.value })
    inviteToken.value = result.token
    inviteUrl.value = `${window.location.origin}/join?token=${result.token}&campaign=${campaignId}`
  } catch (e: unknown) {
    alert((e as { data?: { message?: string } })?.data?.message || t('members.failedInvite'))
  } finally {
    inviting.value = false
  }
}

async function copyInviteUrl() {
  try {
    await navigator.clipboard.writeText(inviteUrl.value)
    copyFeedback.value = true
    setTimeout(() => {
      copyFeedback.value = false
    }, 2000)
  } catch {
    /* ignore */
  }
}

async function changeRole(userId: string, newRole: string) {
  try {
    await api.updateMember(userId, { role: newRole })
    await loadMembers()
  } catch (e: unknown) {
    alert((e as { data?: { message?: string } })?.data?.message || t('errors.failedSave'))
  }
}

async function removeMember(userId: string) {
  if (!confirm(t('members.removeConfirm'))) return
  try {
    await api.removeMember(userId)
    await loadMembers()
  } catch (e: unknown) {
    alert((e as { data?: { message?: string } })?.data?.message || t('common.remove'))
  }
}

function onSearchInput() {
  if (searchTimeout) clearTimeout(searchTimeout)
  addError.value = ''
  if (!searchQuery.value.trim()) {
    searchResults.value = []
    return
  }
  searchTimeout = setTimeout(async () => {
    try {
      searchResults.value = await searchUsers(searchQuery.value.trim())
    } catch {
      searchResults.value = []
    }
  }, 300)
}

function selectUser(u: { id: string; name: string; email: string }) {
  selectedUser.value = u
  searchQuery.value = ''
  searchResults.value = []
}

function clearSelection() {
  selectedUser.value = null
  directRole.value = 'player'
  addError.value = ''
}

async function addExistingUser() {
  if (!selectedUser.value) return
  addingMember.value = true
  addError.value = ''
  try {
    await api.addMemberDirect({ userId: selectedUser.value.id, role: directRole.value })
    await loadMembers()
    clearSelection()
  } catch (e: unknown) {
    const status = (e as { status?: number })?.status
    if (status === 409) {
      addError.value = t('members.alreadyMember')
    } else {
      addError.value =
        (e as { data?: { message?: string } })?.data?.message || t('errors.failedSave')
    }
  } finally {
    addingMember.value = false
  }
}

onMounted(() => {
  loadMembers()
  loadMyRole()
})
</script>
