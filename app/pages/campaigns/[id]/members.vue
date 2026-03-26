<template>
  <div class="p-8">
    <div class="flex items-center gap-2 text-sm text-muted-foreground mb-1">
      <NuxtLink :to="`/campaigns/${campaignId}`" class="hover:text-primary">Campaign</NuxtLink>
      <span>/</span>
      <span>Members</span>
    </div>

    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold">Members</h1>
      <Dialog v-model:open="showInviteDialog">
        <DialogTrigger as-child>
          <Button size="sm">Invite Member</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Member</DialogTitle>
            <DialogDescription>Generate an invitation link to share.</DialogDescription>
          </DialogHeader>
          <div class="space-y-4">
            <div class="space-y-2">
              <label class="text-sm font-medium">Role</label>
              <select v-model="inviteRole" class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="player">Player</option>
                <option value="editor">Editor</option>
                <option value="co_dm">Co-DM</option>
              </select>
            </div>
            <Button @click="generateInvite" :disabled="inviting">
              {{ inviting ? 'Generating...' : 'Generate Link' }}
            </Button>
            <div v-if="inviteToken" class="p-3 bg-muted rounded text-sm break-all">
              <p class="text-xs text-muted-foreground mb-1">Share this token with the player:</p>
              <code>{{ inviteToken }}</code>
            </div>
          </div>
        </DialogContent>
      </Dialog>
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
            @change="changeRole(member.userId, ($event.target as HTMLSelectElement).value)"
            class="rounded-md border border-input bg-background px-2 py-1 text-sm"
            :disabled="member.role === 'dm'"
          >
            <option value="dm" disabled>DM</option>
            <option value="co_dm">Co-DM</option>
            <option value="editor">Editor</option>
            <option value="player">Player</option>
            <option value="visitor">Visitor</option>
          </select>
          <button
            v-if="member.role !== 'dm'"
            @click="removeMember(member.userId)"
            class="text-xs text-destructive hover:underline"
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">

const route = useRoute()
const campaignId = route.params.id as string
const api = useCampaignApi(campaignId)

const members = ref<any[]>([])
const showInviteDialog = ref(false)
const inviteRole = ref('player')
const inviting = ref(false)
const inviteToken = ref('')

async function loadMembers() {
  try {
    members.value = await api.getMembers()
  } catch {
    members.value = []
  }
}

async function generateInvite() {
  inviting.value = true
  inviteToken.value = ''
  try {
    const result = await api.createInvite({ role: inviteRole.value })
    inviteToken.value = result.token
  } catch (e: any) {
    alert(e.data?.message || 'Failed to generate invite')
  } finally {
    inviting.value = false
  }
}

async function changeRole(userId: string, newRole: string) {
  try {
    await api.updateMember(userId, { role: newRole })
    await loadMembers()
  } catch (e: any) {
    alert(e.data?.message || 'Failed to change role')
  }
}

async function removeMember(userId: string) {
  if (!confirm('Remove this member?')) return
  try {
    await api.removeMember(userId)
    await loadMembers()
  } catch (e: any) {
    alert(e.data?.message || 'Failed to remove member')
  }
}

onMounted(loadMembers)
</script>
