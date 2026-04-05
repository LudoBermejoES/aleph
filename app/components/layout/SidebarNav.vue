<template>
  <div class="flex flex-col h-full">
    <NuxtLink
      to="/"
      class="flex items-center gap-3 p-4 border-b border-sidebar-border hover:bg-sidebar-accent transition-colors"
    >
      <img src="~/assets/logo/aleph.png" alt="Aleph" class="w-9 h-9 shrink-0" />
      <div>
        <h1 class="text-xl font-bold text-sidebar-primary leading-tight">
          {{ $t('layout.appName') }}
        </h1>
        <p class="text-xs text-sidebar-foreground/60">{{ $t('layout.appSubtitle') }}</p>
      </div>
    </NuxtLink>

    <nav class="flex-1 p-2 space-y-1 overflow-auto">
      <template v-if="campaignId">
        <div class="flex items-center justify-between px-3 py-1">
          <p
            v-if="campaignName"
            class="text-xs font-semibold text-sidebar-foreground/70 uppercase tracking-wider"
          >
            {{ campaignName }}
          </p>
          <PresenceAvatars :users="presenceUsers" :max-visible="4" />
        </div>
        <NuxtLink
          :to="`/campaigns/${campaignId}`"
          class="flex items-center gap-2 px-3 py-2 rounded text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
        >
          <component :is="ICONS.dashboard" class="w-4 h-4 shrink-0" />
          {{ $t('layout.dashboard') }}
        </NuxtLink>
        <template v-for="group in campaignLinkGroups" :key="group.id">
          <div :data-testid="`nav-group-${group.id}`">
            <button
              @click="toggleGroup(group.id)"
              class="w-full flex items-center justify-between px-3 py-1 text-xs font-semibold text-sidebar-foreground/60 uppercase tracking-wider hover:text-sidebar-foreground transition-colors"
            >
              <span class="flex items-center gap-1.5">
                <component :is="group.icon" class="w-3.5 h-3.5 shrink-0" />
                {{ group.label }}
              </span>
              <span class="text-sidebar-foreground/40">{{
                isGroupOpen(group.id) ? '▾' : '▸'
              }}</span>
            </button>
            <template v-if="isGroupOpen(group.id)">
              <NuxtLink
                v-for="link in group.links"
                :key="link.to"
                :to="link.to"
                :class="[
                  'flex items-center gap-2 px-3 py-2 rounded text-sm text-sidebar-foreground hover:bg-sidebar-accent transition-colors',
                  isActive(link.to) ? 'bg-sidebar-accent font-medium' : '',
                ]"
              >
                <component :is="link.icon" class="w-4 h-4 shrink-0" />
                {{ link.label }}
              </NuxtLink>
            </template>
          </div>
        </template>
        <div class="border-t border-sidebar-border my-2" />
      </template>

      <NuxtLink
        to="/"
        class="flex items-center gap-2 px-3 py-2 rounded text-sm text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
      >
        <component :is="ICONS.allCampaigns" class="w-4 h-4 shrink-0" />
        {{ $t('layout.allCampaigns') }}
      </NuxtLink>
    </nav>

    <!-- User info + sign out -->
    <div class="p-3 border-t border-sidebar-border">
      <p v-if="userName" class="text-xs text-muted-foreground mb-1">{{ userName }}</p>
      <div class="flex items-center justify-between mt-1">
        <div class="flex items-center gap-3">
          <button
            @click="$emit('logout')"
            class="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <component :is="ICONS.signOut" class="w-3.5 h-3.5" />
            {{ $t('auth.signOut') }}
          </button>
          <NuxtLink
            to="/settings"
            class="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <component :is="ICONS.settings" class="w-3.5 h-3.5" />
            {{ $t('settings.title') }}
          </NuxtLink>
        </div>
        <LanguageSwitcher />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ICONS } from '~/utils/icons'

const props = defineProps<{
  campaignId?: string
  campaignName?: string
  userName?: string
  presenceUsers?: any[]
  campaignLinkGroups: any[]
  collapsedGroups: Set<string>
}>()

const emit = defineEmits<{
  logout: []
  toggleGroup: [id: string]
}>()

const route = useRoute()

function toggleGroup(id: string) {
  emit('toggleGroup', id)
}

function isGroupOpen(groupId: string): boolean {
  const group = props.campaignLinkGroups.find((g: any) => g.id === groupId)
  if (group?.links.some((l: any) => route.path.startsWith(l.to))) return true
  return !props.collapsedGroups.has(groupId)
}

function isActive(path: string) {
  return route.path.startsWith(path)
}
</script>
