<template>
  <div class="p-8">
    <div class="flex items-center gap-2 text-sm text-muted-foreground mb-1">
      <NuxtLink :to="`/campaigns/${campaignId}`" class="hover:text-primary">Campaign</NuxtLink>
      <span>/</span>
      <span>{{ $t('characters.title') }}</span>
    </div>

    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold">{{ $t('characters.title') }}</h1>
      <div class="flex gap-2">
        <NuxtLink :to="`/campaigns/${campaignId}/entities`">
          <Button variant="outline" size="sm">{{ $t('characters.allEntities') }}</Button>
        </NuxtLink>
        <NuxtLink :to="`/campaigns/${campaignId}/characters/new`">
          <Button data-testid="new-character-btn">{{ $t('characters.new') }}</Button>
        </NuxtLink>
      </div>
    </div>

    <!-- PC/NPC Toggle -->
    <div class="flex gap-2 mb-6">
      <Button :variant="filter === 'all' ? 'default' : 'outline'" size="sm" @click="filter = 'all'; load()">{{ $t('characters.all') }}</Button>
      <Button :variant="filter === 'pc' ? 'default' : 'outline'" size="sm" @click="filter = 'pc'; load()">{{ $t('characters.pcs') }}</Button>
      <Button :variant="filter === 'npc' ? 'default' : 'outline'" size="sm" @click="filter = 'npc'; load()">{{ $t('characters.npcs') }}</Button>
    </div>

    <div class="flex gap-6">
      <!-- NPC Folder Sidebar -->
      <aside v-if="filter === 'npc' && folders.length" class="w-48 shrink-0" data-testid="folder-sidebar">
        <h3 class="text-sm font-semibold mb-2">{{ $t('characters.folders') }}</h3>
        <button
          class="block w-full text-left text-sm px-2 py-1 rounded mb-1 hover:bg-secondary"
          :class="{ 'bg-secondary font-medium': !selectedFolder }"
          @click="selectedFolder = ''; load()"
        >{{ $t('characters.allNpcs') }}</button>
        <button
          v-for="f in folders"
          :key="f.id"
          class="block w-full text-left text-sm px-2 py-1 rounded mb-1 hover:bg-secondary"
          :class="{ 'bg-secondary font-medium': selectedFolder === f.id }"
          @click="selectedFolder = f.id; load()"
        >{{ f.name }}</button>
      </aside>

      <!-- Character List -->
      <div class="flex-1">
        <LoadingSkeleton v-if="loading" :rows="4" />
        <div v-else-if="chars.length" class="space-y-2">
          <NuxtLink
            v-for="c in chars"
            :key="c.id"
            :to="`/campaigns/${campaignId}/characters/${c.slug}`"
            class="block p-4 rounded-lg border border-border hover:border-primary/50 transition-colors"
          >
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <CharacterPortrait :portrait-url="c.portraitUrl ?? null" :name="c.name" :editable="false" size="sm" />
                <div>
                <span class="font-medium">{{ c.name }}</span>
                <span class="inline-flex items-center gap-1 text-xs ml-2 px-2 py-0.5 rounded bg-secondary text-secondary-foreground">
                  <component :is="c.characterType === 'pc' ? ICONS.pc : ICONS.npc" class="w-3 h-3" />{{ c.characterType }}</span>
                <span v-if="c.race" class="text-xs ml-1 text-muted-foreground">{{ c.race }}</span>
                <span v-if="c.class" class="text-xs ml-1 text-muted-foreground">{{ c.class }}</span>
                <span v-if="c.isCompanionOf" class="text-xs ml-1 text-muted-foreground italic">{{ $t('characters.companion') }}</span>
                </div>
              </div>
              <span :class="['inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded', c.status === 'alive' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' : c.status === 'dead' ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' : 'bg-secondary text-secondary-foreground']">
                <component :is="ICONS[c.status as 'alive' | 'dead' | 'missing' | 'unknown'] ?? ICONS.unknown" class="w-3 h-3" />
                {{ c.status }}
              </span>
            </div>
          </NuxtLink>
        </div>
        <EmptyState v-else icon="🧙" :title="$t('characters.empty')" :description="$t('characters.emptyDescription')">
          <NuxtLink :to="`/campaigns/${campaignId}/characters/new`"><Button size="sm">{{ $t('characters.new') }}</Button></NuxtLink>
        </EmptyState>
      </div>
    </div>
    <ErrorToast v-if="error" :message="error" @dismiss="dismissError" />
  </div>
</template>

<script setup lang="ts">
import { ICONS } from '~/utils/icons'
const route = useRoute()
const campaignId = route.params.id as string
import type { Character, CharacterFolder } from '~/types/api'

const chars = ref<Character[]>([])
const folders = ref<CharacterFolder[]>([])
const filter = ref('all')
const selectedFolder = ref('')
const { loading, error, withLoading, dismissError } = useLoadingState()
const api = useCampaignApi(campaignId)

async function load() {
  await withLoading(async () => {
    const params: Record<string, string> = {}
    if (filter.value !== 'all') params.type = filter.value
    if (selectedFolder.value) params.folderId = selectedFolder.value
    chars.value = await api.getCharacters(params)
  })
}

async function loadFolders() {
  folders.value = await api.getCharacterFolders().catch(() => [])
}

onMounted(async () => {
  await Promise.all([load(), loadFolders()])
})
</script>
