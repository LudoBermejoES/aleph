<template>
  <NuxtLink
    :to="`/campaigns/${campaignId}/characters/${character.slug}`"
    class="block p-4 rounded-lg border border-border hover:border-primary/50 transition-colors"
  >
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <CharacterPortrait :portrait-url="character.portraitUrl ?? null" :name="character.name" :editable="false" size="sm" />
        <div>
          <span class="font-medium">{{ character.name }}</span>
          <span class="inline-flex items-center gap-1 text-xs ml-2 px-2 py-0.5 rounded bg-secondary text-secondary-foreground">
            <component :is="character.characterType === 'pc' ? ICONS.pc : ICONS.npc" class="w-3 h-3" />{{ character.characterType }}
          </span>
          <span v-if="character.race" class="text-xs ml-1 text-muted-foreground">{{ character.race }}</span>
          <span v-if="character.class" class="text-xs ml-1 text-muted-foreground">{{ character.class }}</span>
          <span v-if="character.alignment" class="text-xs ml-1 text-muted-foreground italic">{{ character.alignment }}</span>
          <span v-if="character.isCompanionOf" class="text-xs ml-1 text-muted-foreground italic">{{ $t('characters.companion') }}</span>
          <span v-if="character.locationName" class="inline-flex items-center gap-0.5 text-xs ml-2 text-muted-foreground" data-testid="location-indicator">
            <component :is="ICONS.locations" class="w-3 h-3" />{{ character.locationName }}
          </span>
          <span v-if="character.primaryOrg" class="inline-flex items-center gap-1 text-xs ml-2 px-2 py-0.5 rounded bg-secondary text-secondary-foreground" data-testid="org-badge">
            <component :is="ICONS.organizations" class="w-3 h-3" />{{ character.primaryOrg.name }}
          </span>
        </div>
      </div>
      <span
        :class="[
          'inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded',
          character.status === 'alive' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' :
          character.status === 'dead' ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' :
          character.status === 'missing' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300' :
          'bg-secondary text-secondary-foreground'
        ]"
        data-testid="status-badge"
      >
        <component :is="ICONS[character.status as 'alive' | 'dead' | 'missing' | 'unknown'] ?? ICONS.unknown" class="w-3 h-3" />
        {{ character.status }}
      </span>
    </div>
  </NuxtLink>
</template>

<script setup lang="ts">
import { ICONS } from '~/utils/icons'
import type { Character } from '~/types/api'

defineProps<{
  character: Character
  campaignId: string
}>()
</script>
