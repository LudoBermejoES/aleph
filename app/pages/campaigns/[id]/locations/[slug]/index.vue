<template>
  <div class="p-8 max-w-4xl">
    <LoadingSkeleton v-if="loading" :rows="4" />
    <ErrorToast v-if="error" :message="error" @dismiss="error = null" />
    <template v-else-if="location">
      <!-- Breadcrumb -->
      <div class="flex items-center gap-2 text-sm text-muted-foreground mb-4 flex-wrap">
        <NuxtLink :to="`/campaigns/${campaignId}`" class="hover:text-primary">
          {{ $t('common.campaign') }}</NuxtLink
        >
        <span>/</span>
        <NuxtLink :to="`/campaigns/${campaignId}/locations`" class="hover:text-primary">{{
          $t('locations.title')
        }}</NuxtLink>
        <template v-for="ancestor in location.ancestors" :key="ancestor.slug">
          <span>/</span>
          <NuxtLink
            :to="`/campaigns/${campaignId}/locations/${ancestor.slug}`"
            class="hover:text-primary"
            >{{ ancestor.name }}</NuxtLink
          >
        </template>
        <span>/</span><span>{{ location.name }}</span>
      </div>

      <!-- Header -->
      <div class="flex items-start justify-between gap-4 mb-6 flex-wrap gap-y-2">
        <div class="flex items-start gap-4">
          <EntityImage
            v-if="location.primaryImageUrl"
            :image-url="location.primaryImageUrl"
            :name="location.name"
            size="lg"
          />
          <div>
            <h1 class="text-2xl font-bold">{{ location.name }}</h1>
            <span class="text-sm text-muted-foreground capitalize">{{
              $t(`locations.subtypes.${location.subtype || 'other'}`)
            }}</span>
          </div>
        </div>
        <div class="flex gap-2 shrink-0">
          <NuxtLink :to="`/campaigns/${campaignId}/locations/${slug}/edit`">
            <Button variant="outline" size="sm">{{ $t('common.edit') }}</Button>
          </NuxtLink>
          <Button variant="destructive" size="sm" @click="confirmDelete">{{
            $t('common.delete')
          }}</Button>
        </div>
      </div>

      <!-- Preview Role Switcher (DM only) -->
      <PreviewRoleSwitcher
        v-if="isDm"
        :campaign-role="campaignRole"
        :campaign-id="campaignId"
        :entity-slug="slug"
        class="mb-4"
      />

      <!-- Template Fields -->
      <TemplateFieldsDisplay
        :campaign-id="campaignId"
        :template-id="location.templateId"
        :field-values="location.fields || {}"
      />

      <!-- Description -->
      <div v-if="location.content" ref="contentRef" class="prose dark:prose-invert max-w-none mb-8">
        <MDC :value="location.content as string" />
      </div>

      <!-- Map placements (show-entity-map-pins) -->
      <EntityMapPlacements
        :campaign-id="campaignId"
        :entity-slug="slug"
        :entity-name="location.name"
      />

      <!-- Secret Notes (DM only) -->
      <SecretNotes
        v-if="isDm"
        :campaign-id="campaignId"
        :entity-slug="slug"
        :campaign-role="campaignRole"
        class="mt-6 mb-6"
      />

      <!-- Images -->
      <LocationImageGallery
        :campaign-id="campaignId"
        :slug="slug"
        :name="location.name"
        :editable="canEdit"
        @changed="onImagesChanged"
      />

      <!-- Sub-locations -->
      <section class="mb-6">
        <h2 class="text-lg font-semibold mb-3">{{ $t('locations.subLocations') }}</h2>
        <div v-if="subLocations.length === 0" class="text-sm text-muted-foreground">
          {{ $t('locations.noSubLocations') }}
        </div>
        <div v-else class="space-y-2">
          <NuxtLink
            v-for="sub in subLocations"
            :key="sub.id"
            :to="`/campaigns/${campaignId}/locations/${sub.slug}`"
            class="flex items-center gap-2 p-2 rounded border border-border hover:bg-accent/30 text-sm"
          >
            <span class="font-medium">{{ sub.name }}</span>
            <span class="text-muted-foreground capitalize text-xs">{{
              sub.subtype || 'other'
            }}</span>
          </NuxtLink>
        </div>
        <NuxtLink
          :to="`/campaigns/${campaignId}/locations/new?parentId=${location.id}`"
          class="mt-2 inline-block text-sm text-primary hover:underline"
        >
          + Sub-location
        </NuxtLink>
      </section>

      <!-- Inhabitants -->
      <section class="mb-6">
        <h2 class="text-lg font-semibold mb-3">{{ $t('locations.inhabitants') }}</h2>
        <div v-if="inhabitants.length === 0" class="text-sm text-muted-foreground mb-2">
          {{ $t('locations.noInhabitants') }}
        </div>
        <div v-else class="space-y-2 mb-3">
          <div
            v-for="c in inhabitants"
            :key="c.id"
            class="flex items-center gap-2 p-2 rounded border border-border"
          >
            <NuxtLink
              :to="`/campaigns/${campaignId}/characters/${c.slug}`"
              class="flex-1 text-sm font-medium hover:text-primary"
              >{{ c.name }}</NuxtLink
            >
            <span class="text-xs text-muted-foreground">{{
              $t(`characters.${c.characterType}`)
            }}</span>
            <button
              type="button"
              class="text-xs text-destructive hover:underline"
              @click="removeInhabitant(c.id)"
            >
              {{ $t('common.remove') }}
            </button>
          </div>
        </div>
        <div class="flex gap-2 items-center">
          <select
            v-model="selectedCharacter"
            class="flex-1 px-3 py-1.5 rounded border border-input bg-background text-sm"
            :aria-label="$t('aria.filters.locationCharacter')"
          >
            <option value="">{{ $t('locations.selectCharacter') }}</option>
            <option v-for="c in availableCharacters" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
          <Button size="sm" :disabled="!selectedCharacter" @click="addInhabitant">{{
            $t('locations.addInhabitant')
          }}</Button>
        </div>
      </section>

      <!-- Organizations -->
      <section class="mb-6">
        <h2 class="text-lg font-semibold mb-3">{{ $t('locations.organizations') }}</h2>
        <div v-if="orgs.length === 0" class="text-sm text-muted-foreground mb-2">
          {{ $t('locations.noOrganizations') }}
        </div>
        <div v-else class="space-y-2 mb-3">
          <div
            v-for="org in orgs"
            :key="org.id"
            class="flex items-center gap-2 p-2 rounded border border-border"
          >
            <NuxtLink
              :to="`/campaigns/${campaignId}/organizations/${org.slug}`"
              class="flex-1 text-sm font-medium hover:text-primary"
              >{{ org.name }}</NuxtLink
            >
            <span class="text-xs text-muted-foreground">{{ org.memberCount }} members</span>
            <button
              type="button"
              class="text-xs text-destructive hover:underline"
              @click="removeOrganization(org.id)"
            >
              {{ $t('common.remove') }}
            </button>
          </div>
        </div>
        <div class="flex gap-2 items-center">
          <select
            v-model="selectedOrg"
            class="flex-1 px-3 py-1.5 rounded border border-input bg-background text-sm"
            :aria-label="$t('aria.filters.locationOrganization')"
          >
            <option value="">{{ $t('locations.selectOrganization') }}</option>
            <option v-for="org in availableOrgs" :key="org.id" :value="org.id">
              {{ org.name }}
            </option>
          </select>
          <Button size="sm" :disabled="!selectedOrg" @click="addOrganization">{{
            $t('locations.addOrganization')
          }}</Button>
        </div>
      </section>

      <!-- Editable Relations Panel -->
      <EntityRelationsPanel
        :campaign-id="campaignId"
        :entity-id="location.id"
        entity-type="location"
        :entity-slug="slug"
        :entity-name="location.name"
        :role="campaignRole"
        class="mb-6"
        @relations-changed="load"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const campaignId = route.params.id as string
const slug = route.params.slug as string
const api = useCampaignApi(campaignId)

const { loading, error, withLoading } = useLoadingState()
interface LocationData {
  id: string
  name: string
  slug: string
  subtype?: string
  content?: string
  parentId?: string | null
  templateId?: string | null
  fields?: Record<string, unknown>
  primaryImageUrl?: string | null
}
interface CharacterEntry {
  id: string
  name: string
  slug: string
  characterType: string
}
interface OrgEntry {
  id: string
  name: string
  slug: string
  memberCount?: number
}

const location = ref<LocationData | null>(null)
const subLocations = ref<LocationData[]>([])
const inhabitants = ref<CharacterEntry[]>([])
const orgs = ref<OrgEntry[]>([])
const allCharacters = ref<CharacterEntry[]>([])
const allOrgs = ref<OrgEntry[]>([])
const selectedCharacter = ref('')
const selectedOrg = ref('')
const campaignRole = ref('')
const isDm = computed(() => ['dm', 'co_dm'].includes(campaignRole.value))
const canEdit = computed(() => ['dm', 'co_dm', 'editor'].includes(campaignRole.value))
const contentRef = ref<HTMLElement>()
const { loadRevealedBlocks, injectRevealButtons } = useSecretReveals(
  contentRef,
  campaignId,
  slug,
  isDm,
  t,
)

const availableCharacters = computed(() =>
  allCharacters.value.filter((c) => !inhabitants.value.some((i) => i.id === c.id)),
)

const availableOrgs = computed(() =>
  allOrgs.value.filter((o) => !orgs.value.some((linked) => linked.id === o.id)),
)

async function load() {
  await withLoading(async () => {
    const previewAs = route.query.preview_as as string | undefined
    const locationParams = previewAs ? { preview_as: previewAs } : undefined
    const [loc, subs, inh, linkedOrgs, chars, allOrgsList, campaign] = await Promise.all([
      api.getLocation(slug, locationParams),
      api.getSubLocations(slug),
      api.getLocationInhabitants(slug),
      api.getLocationOrganizations(slug),
      api.getCharacters({}),
      api.getOrganizations(),
      api.getCampaign().catch(() => null),
    ])
    location.value = loc
    subLocations.value = subs
    inhabitants.value = inh
    orgs.value = linkedOrgs
    allCharacters.value = chars
    allOrgs.value = allOrgsList
    campaignRole.value = campaign?.role ?? ''
  })
}

watch(
  () => route.query.preview_as,
  async () => {
    await load()
    await nextTick()
    injectRevealButtons()
  },
)

onMounted(async () => {
  await load()
  await loadRevealedBlocks()
  await nextTick()
  injectRevealButtons()
})

// The header image reads primaryImageUrl, so it has to follow a gallery change without a reload.
function onImagesChanged(images: { url: string; isPrimary: boolean }[]) {
  if (!location.value) return
  location.value.primaryImageUrl = images.find((i) => i.isPrimary)?.url ?? null
}

async function addInhabitant() {
  if (!selectedCharacter.value) return
  await api.addLocationInhabitant(slug, selectedCharacter.value)
  selectedCharacter.value = ''
  inhabitants.value = await api.getLocationInhabitants(slug)
}

async function removeInhabitant(characterId: string) {
  await api.removeLocationInhabitant(slug, characterId)
  inhabitants.value = await api.getLocationInhabitants(slug)
}

async function addOrganization() {
  if (!selectedOrg.value) return
  await api.addLocationOrganization(slug, selectedOrg.value)
  selectedOrg.value = ''
  orgs.value = await api.getLocationOrganizations(slug)
}

async function removeOrganization(organizationId: string) {
  await api.removeLocationOrganization(slug, organizationId)
  orgs.value = await api.getLocationOrganizations(slug)
}

async function confirmDelete() {
  if (!confirm(t('locations.confirmDeleteMessage'))) return
  await api.deleteLocation(slug)
  await router.push(`/campaigns/${campaignId}/locations`)
}
</script>
