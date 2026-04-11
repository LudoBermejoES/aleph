<template>
  <div class="p-8 max-w-4xl">
    <div class="flex items-center gap-2 text-sm text-muted-foreground mb-1">
      <NuxtLink :to="`/campaigns/${campaignId}`" class="hover:text-primary">
        {{ $t('common.campaign') }}</NuxtLink
      >
      <span>/</span>
      <NuxtLink :to="`/campaigns/${campaignId}/organizations`" class="hover:text-primary">{{
        $t('organizations.title')
      }}</NuxtLink>
      <span>/</span>
      <span>{{ org?.name }}</span>
    </div>

    <LoadingSkeleton v-if="loading" :rows="4" />
    <ErrorToast v-if="error" :message="error" @dismiss="error = null" />
    <div v-else-if="org">
      <div class="flex items-start gap-6 mb-6">
        <EntityImage
          :image-url="org.imageUrl ?? null"
          :name="org.name"
          :editable="true"
          :campaign-id="campaignId"
          :upload-url="`/api/campaigns/${campaignId}/organizations/${slug}/image`"
          size="lg"
          @uploaded="
            (url: string) => {
              if (org) org.imageUrl = url
            }
          "
        />
        <div class="flex-1">
          <div class="flex items-start justify-between">
            <div>
              <h1 class="text-2xl font-bold">{{ org.name }}</h1>
              <div class="flex gap-2 mt-2">
                <span class="text-xs px-2 py-0.5 rounded bg-secondary text-secondary-foreground">{{
                  $t(`organizations.types.${org.type}`)
                }}</span>
                <span class="text-xs px-2 py-0.5 rounded bg-secondary text-secondary-foreground">{{
                  $t(`organizations.statuses.${org.status}`)
                }}</span>
              </div>
            </div>
            <div class="flex gap-2">
              <NuxtLink :to="`/campaigns/${campaignId}/organizations/${slug}/edit`">
                <Button variant="outline" size="sm">{{ $t('common.edit') }}</Button>
              </NuxtLink>
              <Button v-if="isDm" variant="destructive" size="sm" @click="confirmDelete">{{
                $t('common.delete')
              }}</Button>
            </div>
          </div>
          <div
            v-if="org.description"
            class="prose dark:prose-invert max-w-none text-muted-foreground mt-4"
          >
            <MDC :value="org.description as string" />
          </div>
        </div>
      </div>

      <!-- Template Fields -->
      <TemplateFieldsDisplay
        :campaign-id="campaignId"
        :template-id="org.templateId"
        :field-values="org.fields || {}"
      />

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
              <NuxtLink
                :to="`/campaigns/${campaignId}/characters/${member.characterSlug}`"
                class="font-medium hover:underline"
              >
                {{ member.characterName }}
              </NuxtLink>
              <span v-if="member.role" class="text-sm text-muted-foreground ml-2"
                >— {{ member.role }}</span
              >
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
            <label class="block text-xs font-medium mb-1">{{
              $t('organizations.selectCharacter')
            }}</label>
            <select
              v-model="newMemberId"
              class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">{{ $t('organizations.selectCharacter') }}</option>
              <option v-for="c in availableCharacters" :key="c.id" :value="c.id">
                {{ c.name }}
              </option>
            </select>
          </div>
          <div class="w-48">
            <label class="block text-xs font-medium mb-1">{{
              $t('organizations.memberRole')
            }}</label>
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

      <!-- Locations section -->
      <div class="mt-6">
        <h2 class="text-lg font-semibold mb-3">{{ $t('locations.title') }}</h2>
        <div v-if="orgLocations.length" class="space-y-2 mb-2">
          <NuxtLink
            v-for="loc in orgLocations"
            :key="loc.id"
            :to="`/campaigns/${campaignId}/locations/${loc.slug}`"
            class="block p-2 rounded border border-border hover:bg-accent/30 text-sm font-medium"
            >{{ loc.name }}</NuxtLink
          >
        </div>
        <p v-else class="text-sm text-muted-foreground">{{ $t('locations.noOrganizations') }}</p>
      </div>
    </div>
    <div v-else class="text-center py-12 text-muted-foreground">
      <p>Organization not found.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const router = useRouter()
const campaignId = route.params.id as string
const slug = route.params.slug as string
const { t } = useI18n()
const api = useCampaignApi(campaignId)
const campaignRole = ref('')
const isDm = computed(() => ['dm', 'co_dm'].includes(campaignRole.value))

interface OrgData {
  members?: { characterId: string; role?: string | null }[]
  [key: string]: unknown
}
interface CharEntry {
  id: string
  name: string
  slug: string
}
interface LocEntry {
  id: string
  name: string
  slug: string
}

const org = ref<OrgData | null>(null)
const { loading, error, withLoading } = useLoadingState()
const allCharacters = ref<CharEntry[]>([])
const orgLocations = ref<LocEntry[]>([])
const newMemberId = ref('')
const newMemberRole = ref('')
const addingMember = ref(false)

const availableCharacters = computed(() => {
  const memberIds = new Set(org.value?.members?.map((m) => m.characterId) ?? [])
  return allCharacters.value.filter((c) => !memberIds.has(c.id))
})

async function load() {
  await withLoading(async () => {
    const [orgData, chars, locs, campaign] = await Promise.all([
      api.getOrganization(slug),
      api.getCharacters({}).catch(() => []),
      api.getOrganizationLocations(slug).catch(() => []),
      api.getCampaign().catch(() => null),
    ])
    org.value = orgData
    allCharacters.value = chars
    orgLocations.value = locs
    campaignRole.value = campaign?.role ?? ''
  })
}

async function addMember() {
  if (!newMemberId.value) return
  addingMember.value = true
  try {
    await api.addOrganizationMember(slug, {
      characterId: newMemberId.value,
      role: newMemberRole.value || undefined,
    })
    newMemberId.value = ''
    newMemberRole.value = ''
    await load()
  } catch (e: unknown) {
    alert((e as { data?: { message?: string } })?.data?.message || 'Failed to add member')
  } finally {
    addingMember.value = false
  }
}

async function removeMember(characterId: string) {
  try {
    await api.removeOrganizationMember(slug, characterId)
    await load()
  } catch (e: unknown) {
    alert((e as { data?: { message?: string } })?.data?.message || 'Failed to remove member')
  }
}

async function confirmDelete() {
  if (!confirm(t('organizations.confirmDeleteMessage'))) return
  await api.deleteOrganization(slug)
  router.push(`/campaigns/${campaignId}/organizations`)
}

onMounted(load)
</script>
