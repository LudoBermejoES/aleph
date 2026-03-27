<template>
  <div class="p-8 max-w-4xl">
    <div class="flex items-center gap-2 text-sm text-muted-foreground mb-1">
      <NuxtLink :to="`/campaigns/${campaignId}`" class="hover:text-primary">Campaign</NuxtLink>
      <span>/</span>
      <NuxtLink :to="`/campaigns/${campaignId}/organizations`" class="hover:text-primary">{{ $t('organizations.title') }}</NuxtLink>
      <span>/</span>
      <span>{{ org?.name }}</span>
    </div>

    <LoadingSkeleton v-if="loading" :rows="4" />
    <div v-else-if="org">
      <div class="flex items-start justify-between mb-6">
        <div>
          <h1 class="text-2xl font-bold">{{ org.name }}</h1>
          <div class="flex gap-2 mt-2">
            <span class="text-xs px-2 py-0.5 rounded bg-secondary text-secondary-foreground">{{ $t(`organizations.types.${org.type}`) }}</span>
            <span class="text-xs px-2 py-0.5 rounded bg-secondary text-secondary-foreground">{{ $t(`organizations.statuses.${org.status}`) }}</span>
          </div>
        </div>
        <NuxtLink :to="`/campaigns/${campaignId}/organizations/${slug}/edit`">
          <Button variant="outline" size="sm">{{ $t('common.edit') }}</Button>
        </NuxtLink>
      </div>

      <p v-if="org.description" class="text-muted-foreground mb-6">{{ org.description }}</p>

      <!-- Members section -->
      <div>
        <div class="flex items-center justify-between mb-3">
          <h2 class="text-lg font-semibold">{{ $t('organizations.members') }}</h2>
        </div>

        <div v-if="org.members?.length" class="space-y-2 mb-4" data-testid="member-list">
          <div
            v-for="member in org.members"
            :key="member.characterId"
            class="flex items-center justify-between p-3 rounded-lg border border-border"
            :data-testid="`member-row-${member.characterId}`"
          >
            <div>
              <NuxtLink :to="`/campaigns/${campaignId}/characters/${member.characterSlug}`" class="font-medium hover:underline">
                {{ member.characterName }}
              </NuxtLink>
              <span v-if="member.role" class="text-sm text-muted-foreground ml-2">— {{ member.role }}</span>
            </div>
            <Button variant="destructive" size="sm" @click="removeMember(member.characterId)">
              {{ $t('organizations.removeMember') }}
            </Button>
          </div>
        </div>
        <p v-else class="text-muted-foreground text-sm mb-4">{{ $t('organizations.noMembers') }}</p>

        <!-- Add member form -->
        <div class="flex gap-2 items-end">
          <div class="flex-1">
            <label class="block text-xs font-medium mb-1">{{ $t('organizations.selectCharacter') }}</label>
            <select v-model="newMemberId" class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option value="">{{ $t('organizations.selectCharacter') }}</option>
              <option v-for="c in availableCharacters" :key="c.id" :value="c.id">{{ c.name }}</option>
            </select>
          </div>
          <div class="w-48">
            <label class="block text-xs font-medium mb-1">{{ $t('organizations.memberRole') }}</label>
            <input
              v-model="newMemberRole"
              type="text"
              class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              :placeholder="$t('organizations.memberRolePlaceholder')"
            />
          </div>
          <Button :disabled="!newMemberId || addingMember" @click="addMember">
            {{ $t('organizations.addMember') }}
          </Button>
        </div>
      </div>
    </div>
    <div v-else class="text-center py-12 text-muted-foreground">
      <p>Organization not found.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const campaignId = route.params.id as string
const slug = route.params.slug as string
const api = useCampaignApi(campaignId)

const org = ref<any>(null)
const loading = ref(true)
const allCharacters = ref<any[]>([])
const newMemberId = ref('')
const newMemberRole = ref('')
const addingMember = ref(false)

const availableCharacters = computed(() => {
  const memberIds = new Set(org.value?.members?.map((m: any) => m.characterId) ?? [])
  return allCharacters.value.filter(c => !memberIds.has(c.id))
})

async function load() {
  loading.value = true
  const [orgData, chars] = await Promise.all([
    api.getOrganization(slug).catch(() => null),
    api.getCharacters({}).catch(() => []),
  ])
  org.value = orgData
  allCharacters.value = chars
  loading.value = false
}

async function addMember() {
  if (!newMemberId.value) return
  addingMember.value = true
  try {
    await api.addOrganizationMember(slug, { characterId: newMemberId.value, role: newMemberRole.value || undefined })
    newMemberId.value = ''
    newMemberRole.value = ''
    await load()
  } catch (e: any) {
    alert(e.data?.message || 'Failed to add member')
  } finally {
    addingMember.value = false
  }
}

async function removeMember(characterId: string) {
  try {
    await api.removeOrganizationMember(slug, characterId)
    await load()
  } catch (e: any) {
    alert(e.data?.message || 'Failed to remove member')
  }
}

onMounted(load)
</script>
