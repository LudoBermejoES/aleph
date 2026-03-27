<template>
  <div class="p-8">
    <div v-if="character">
      <div class="flex items-center gap-2 text-sm text-muted-foreground mb-4">
        <NuxtLink :to="`/campaigns/${campaignId}`" class="hover:text-primary">Campaign</NuxtLink>
        <span>/</span>
        <NuxtLink :to="`/campaigns/${campaignId}/characters`" class="hover:text-primary">{{ $t('characters.title') }}</NuxtLink>
        <span>/</span>
        <span class="text-foreground">{{ character.name }}</span>
      </div>

      <div class="flex gap-6 mb-6">
        <!-- Portrait -->
        <CharacterPortrait
          :portrait-url="character.portraitUrl ?? null"
          :name="character.name"
          :editable="canEdit"
          :campaign-id="campaignId"
          :character-slug="slug"
          size="lg"
          @uploaded="url => { if (character) character.portraitUrl = url }"
        />

        <div class="flex-1">
      <div class="flex items-start justify-between mb-4">
        <div>
          <h1 class="text-3xl font-bold">{{ character.name }}</h1>
          <div class="flex items-center gap-2 mt-2">
            <span class="text-xs px-2 py-1 rounded bg-secondary text-secondary-foreground">{{ character.characterType }}</span>
            <span v-if="character.race" class="text-xs px-2 py-1 rounded bg-secondary text-secondary-foreground">{{ character.race }}</span>
            <span v-if="character.class" class="text-xs px-2 py-1 rounded bg-secondary text-secondary-foreground">{{ character.class }}</span>
            <span v-if="character.alignment" class="text-xs text-muted-foreground">{{ character.alignment }}</span>
            <span :class="['text-xs px-2 py-1 rounded', character.status === 'alive' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300']">
              {{ character.status }}
            </span>
          </div>
          <NuxtLink v-if="character.locationSlug" :to="`/campaigns/${campaignId}/locations/${character.locationSlug}`" class="text-xs text-muted-foreground hover:text-primary ml-1" data-testid="character-location">
            📍 {{ character.locationName }}
          </NuxtLink>
          <!-- Mount/Companion indicator (7.8) -->
          <span v-if="calculatedAge !== null" class="text-xs text-muted-foreground ml-2" data-testid="character-age">
            {{ $t('characters.age') }} {{ calculatedAge }}
          </span>
          <p v-if="character.isCompanionOf" class="text-xs text-muted-foreground mt-1">
            {{ $t('characters.companionOf') }}
          </p>
        </div>
        <NuxtLink :to="`/campaigns/${campaignId}/characters/${slug}/edit`">
          <Button variant="outline" size="sm" data-testid="edit-character">{{ $t('common.edit') }}</Button>
        </NuxtLink>
      </div>
        </div><!-- end flex-1 -->
      </div><!-- end portrait+header flex -->

      <!-- Stats -->
      <div v-if="character.stats?.length" class="mb-6" data-testid="character-stats">
        <h2 class="text-lg font-semibold mb-3">{{ $t('characters.stats') }}</h2>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-2">
          <div v-for="stat in character.stats" :key="stat.id" class="p-2 rounded border border-border text-center">
            <div class="text-xs text-muted-foreground">{{ stat.defName }}</div>
            <div class="text-lg font-bold">{{ stat.value ?? (stat.defValueType === 'boolean' ? '—' : '0') }}</div>
          </div>
        </div>
      </div>

      <!-- Abilities -->
      <div v-if="character.abilities?.length" class="mb-6" data-testid="character-abilities">
        <h2 class="text-lg font-semibold mb-3">{{ $t('characters.abilities') }}</h2>
        <div class="space-y-2">
          <div v-for="ab in character.abilities" :key="ab.id" class="p-3 rounded border border-border">
            <div class="flex items-center gap-2">
              <span class="font-medium">{{ ab.name }}</span>
              <span class="text-xs px-2 py-0.5 rounded bg-secondary text-secondary-foreground">{{ ab.type }}</span>
            </div>
            <p v-if="ab.description" class="text-sm text-muted-foreground mt-1">{{ ab.description }}</p>
          </div>
        </div>
      </div>

      <!-- Connections (7.5) -->
      <div v-if="connections.length" class="mb-6" data-testid="character-connections">
        <h2 class="text-lg font-semibold mb-3">{{ $t('characters.connections') }}</h2>
        <div class="space-y-2">
          <div v-for="conn in connections" :key="conn.id" class="flex items-center gap-2 p-2 rounded border border-border">
            <NuxtLink
              v-if="conn.targetEntitySlug"
              :to="conn.targetEntityType === 'character' ? `/campaigns/${campaignId}/characters/${conn.targetEntitySlug}` : `/campaigns/${campaignId}/entities/${conn.targetEntitySlug}`"
              class="font-medium hover:underline"
            >{{ conn.targetEntityName || conn.targetEntitySlug }}</NuxtLink>
            <span v-else class="font-medium">{{ conn.targetEntityName || conn.targetEntityId }}</span>
            <span v-if="conn.label" class="text-xs px-2 py-0.5 rounded bg-secondary text-secondary-foreground">{{ conn.label }}</span>
            <span v-if="conn.description" class="text-sm text-muted-foreground">{{ conn.description }}</span>
          </div>
        </div>
      </div>

      <!-- Companions/Mounts (7.8) -->
      <div v-if="companions.length" class="mb-6" data-testid="character-companions">
        <h2 class="text-lg font-semibold mb-3">{{ $t('characters.companions') }}</h2>
        <div class="space-y-2">
          <NuxtLink
            v-for="comp in companions"
            :key="comp.id"
            :to="`/campaigns/${campaignId}/characters/${comp.slug}`"
            class="block p-3 rounded border border-border hover:border-primary/50 transition-colors"
          >
            <span class="font-medium">{{ comp.name }}</span>
            <span v-if="comp.race" class="text-xs ml-2 text-muted-foreground">{{ comp.race }}</span>
          </NuxtLink>
        </div>
      </div>

      <!-- Wealth (inventory-economy) -->
      <div v-if="character.id" class="mb-6" data-testid="character-wealth">
        <h2 class="text-lg font-semibold mb-3">{{ $t('characters.wealth') }}</h2>
        <WealthDisplay :campaign-id="campaignId" :owner-id="character.id" owner-type="character" />
      </div>

      <!-- Inventory (inventory-economy) -->
      <div v-if="character.id" class="mb-6" data-testid="character-inventory">
        <h2 class="text-lg font-semibold mb-3">{{ $t('characters.inventory') }}</h2>
        <InventoryPanel :campaign-id="campaignId" :owner-id="character.id" owner-type="character" />
      </div>

      <!-- Organizations (organizations change) -->
      <div class="mb-6" data-testid="character-organizations">
        <h2 class="text-lg font-semibold mb-3">{{ $t('organizations.title') }}</h2>
        <div v-if="characterOrgs.length" class="space-y-2">
          <NuxtLink
            v-for="mem in characterOrgs"
            :key="mem.organizationId"
            :to="`/campaigns/${campaignId}/organizations/${mem.organizationSlug}`"
            class="block p-3 rounded border border-border hover:border-primary/50 transition-colors"
          >
            <span class="font-medium">{{ mem.organizationName }}</span>
            <span v-if="mem.role" class="text-sm text-muted-foreground ml-2">— {{ mem.role }}</span>
          </NuxtLink>
        </div>
        <p v-else class="text-sm text-muted-foreground">{{ $t('organizations.noMembers') }}</p>
      </div>

      <!-- Markdown Content -->
      <div class="prose dark:prose-invert max-w-none text-foreground">
        <MDC v-if="character.content" :value="character.content" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const campaignId = route.params.id as string
const slug = route.params.slug as string
import type { Character, CharacterConnection } from '~/types/api'

const character = ref<Character | null>(null)
const connections = ref<CharacterConnection[]>([])
const companions = ref<Character[]>([])
const characterOrgs = ref<any[]>([])

// Age calculation (7.1, 7.2)
const calculatedAge = computed(() => {
  if (!character.value?.frontmatter?.fields?.birthYear) return null
  const birth = {
    year: Number(character.value.frontmatter.fields.birthYear),
    month: Number(character.value.frontmatter.fields.birthMonth || 1),
    day: Number(character.value.frontmatter.fields.birthDay || 1),
  }
  const current = {
    year: Number(character.value.frontmatter?.fields?.currentYear || character.value.currentYear || 0),
    month: Number(character.value.frontmatter?.fields?.currentMonth || character.value.currentMonth || 1),
    day: Number(character.value.frontmatter?.fields?.currentDay || character.value.currentDay || 1),
  }
  if (!current.year) return null
  let age = current.year - birth.year
  if (current.month < birth.month || (current.month === birth.month && current.day < birth.day)) age--
  return Math.max(0, age)
})

const api = useCampaignApi(campaignId)
const canEdit = ref(false)

async function load() {
  const [char, campaign] = await Promise.all([
    api.getCharacter(slug).catch(() => null),
    api.getCampaign().catch(() => null),
  ])
  character.value = char
  canEdit.value = ['dm', 'co_dm', 'editor'].includes(campaign?.role ?? '')

  // Load connections
  connections.value = await api.getCharacterConnections(character.value?.slug ?? slug).catch(() => [])

  // Load companions (characters where isCompanionOf = this character's id)
  companions.value = await api.getCharacters({ companionOf: character.value?.id ?? '' }).catch(() => [])

  // Load organization memberships
  characterOrgs.value = await api.getCharacterOrganizations(slug).catch(() => [])
}

onMounted(load)
</script>
