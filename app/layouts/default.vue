<template>
  <div class="flex h-screen bg-background text-foreground" :data-theme="campaignTheme || undefined">
    <!-- Sidebar -->
    <aside class="w-64 border-r border-border bg-sidebar-background flex flex-col shrink-0">
      <NuxtLink to="/" class="flex items-center gap-3 p-4 border-b border-sidebar-border hover:bg-sidebar-accent transition-colors">
        <img src="~/assets/logo/aleph.png" alt="Aleph" class="w-9 h-9 shrink-0" />
        <div>
          <h1 class="text-xl font-bold text-sidebar-primary leading-tight">{{ $t('layout.appName') }}</h1>
          <p class="text-xs text-sidebar-foreground/60">{{ $t('layout.appSubtitle') }}</p>
        </div>
      </NuxtLink>

      <nav class="flex-1 p-2 space-y-1 overflow-auto">
        <!-- Campaign sidebar when inside a campaign -->
        <template v-if="campaignId">
          <div class="flex items-center justify-between px-3 py-1">
            <p v-if="campaignName" class="text-xs font-semibold text-sidebar-foreground/70 uppercase tracking-wider">{{ campaignName }}</p>
            <PresenceAvatars :users="presenceUsers" :max-visible="4" />
          </div>
          <NuxtLink :to="`/campaigns/${campaignId}`"
            class="flex items-center gap-2 px-3 py-2 rounded text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent transition-colors">
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
                <span class="text-sidebar-foreground/40">{{ isGroupOpen(group.id) ? '▾' : '▸' }}</span>
              </button>
              <template v-if="isGroupOpen(group.id)">
                <NuxtLink v-for="link in group.links" :key="link.to" :to="link.to"
                  :class="['flex items-center gap-2 px-3 py-2 rounded text-sm text-sidebar-foreground hover:bg-sidebar-accent transition-colors', isActive(link.to) ? 'bg-sidebar-accent font-medium' : '']">
                  <component :is="link.icon" class="w-4 h-4 shrink-0" />
                  {{ link.label }}
                </NuxtLink>
              </template>
            </div>
          </template>
          <div class="border-t border-sidebar-border my-2" />
        </template>

        <NuxtLink to="/"
          class="flex items-center gap-2 px-3 py-2 rounded text-sm text-sidebar-foreground hover:bg-sidebar-accent transition-colors">
          <component :is="ICONS.allCampaigns" class="w-4 h-4 shrink-0" />
          {{ $t('layout.allCampaigns') }}
        </NuxtLink>
      </nav>

      <!-- User info + sign out -->
      <div class="p-3 border-t border-sidebar-border">
        <p v-if="userName" class="text-xs text-muted-foreground mb-1">{{ userName }}</p>
        <div class="flex items-center justify-between mt-1">
          <div class="flex items-center gap-3">
            <button @click="handleLogout" class="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
              <component :is="ICONS.signOut" class="w-3.5 h-3.5" />
              {{ $t('auth.signOut') }}
            </button>
            <NuxtLink to="/settings" class="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
              <component :is="ICONS.settings" class="w-3.5 h-3.5" />
              {{ $t('settings.title') }}
            </NuxtLink>
          </div>
          <LanguageSwitcher />
        </div>
      </div>
    </aside>

    <!-- Main content -->
    <main class="flex-1 overflow-auto">
      <slot />
    </main>

    <!-- Global search — available on all campaign pages via Ctrl+K -->
    <SearchCommand v-if="campaignId" :campaign-id="campaignId" />
  </div>
</template>

<script setup lang="ts">
import { authSignOut } from '~/composables/useAuth'
import { ICONS } from '~/utils/icons'

const { t } = useI18n()
const route = useRoute()

const userName = ref('')
const campaignName = ref('')
// Shared state so campaign pages can update theme without full reload
const campaignTheme = useState<string | null>('campaignTheme', () => null)

const campaignId = computed(() => {
  const match = route.path.match(/^\/campaigns\/([^/]+)/)
  return match ? match[1] : undefined
})

// Presence system
const { presenceUsers } = useCampaignSocket(campaignId)

// Fetch campaign name and theme when inside a campaign
watch(campaignId, async (id) => {
  if (id) {
    try {
      const data = await useCampaignApi(id).getCampaign()
      campaignName.value = data?.name || ''
      campaignTheme.value = data?.theme || null
    } catch {
      campaignName.value = ''
      campaignTheme.value = null
    }
  } else {
    campaignName.value = ''
    campaignTheme.value = null
  }
}, { immediate: true })

const campaignLinkGroups = computed(() => {
  if (!campaignId.value) return []
  const id = campaignId.value
  return [
    {
      id: 'world',
      label: t('layout.group.world'),
      icon: ICONS.groupWorld,
      links: [
        { to: `/campaigns/${id}/entities`, label: t('layout.wiki'), icon: ICONS.wiki },
        { to: `/campaigns/${id}/characters`, label: t('layout.characters'), icon: ICONS.characters },
        { to: `/campaigns/${id}/organizations`, label: t('layout.organizations'), icon: ICONS.organizations },
        { to: `/campaigns/${id}/locations`, label: t('layout.locations'), icon: ICONS.locations },
        { to: `/campaigns/${id}/maps`, label: t('layout.maps'), icon: ICONS.maps },
      ],
    },
    {
      id: 'story',
      label: t('layout.group.story'),
      icon: ICONS.groupStory,
      links: [
        { to: `/campaigns/${id}/sessions`, label: t('layout.sessions'), icon: ICONS.sessions },
        { to: `/campaigns/${id}/quests`, label: t('layout.quests'), icon: ICONS.quests },
        { to: `/campaigns/${id}/calendars`, label: t('layout.calendars'), icon: ICONS.calendars },
      ],
    },
    {
      id: 'economy',
      label: t('layout.group.economy'),
      icon: ICONS.groupEconomy,
      links: [
        { to: `/campaigns/${id}/items`, label: t('layout.items'), icon: ICONS.items },
        { to: `/campaigns/${id}/shops`, label: t('layout.shops'), icon: ICONS.shops },
        { to: `/campaigns/${id}/inventories`, label: t('layout.inventories'), icon: ICONS.inventories },
        { to: `/campaigns/${id}/currencies`, label: t('layout.currencies'), icon: ICONS.currencies },
        { to: `/campaigns/${id}/transactions`, label: t('layout.transactions'), icon: ICONS.transactions },
      ],
    },
    {
      id: 'campaign',
      label: t('layout.group.campaign'),
      icon: ICONS.groupCampaign,
      links: [
        { to: `/campaigns/${id}/graph`, label: t('layout.graph'), icon: ICONS.graph },
        { to: `/campaigns/${id}/members`, label: t('layout.members'), icon: ICONS.members },
      ],
    },
  ]
})

// Collapsed state — persisted in localStorage, initialized on mount (client-only)
const collapsedGroups = ref<Set<string>>(new Set())

onMounted(() => {
  try {
    const stored = localStorage.getItem('sidebarCollapsed')
    if (stored) collapsedGroups.value = new Set(JSON.parse(stored))
  } catch {
    // ignore
  }
})

function toggleGroup(id: string) {
  const next = new Set(collapsedGroups.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  collapsedGroups.value = next
  try {
    localStorage.setItem('sidebarCollapsed', JSON.stringify([...next]))
  } catch {
    // ignore
  }
}

function isGroupOpen(groupId: string): boolean {
  // Force open if the current route is inside this group
  const group = campaignLinkGroups.value.find(g => g.id === groupId)
  if (group?.links.some(l => route.path.startsWith(l.to))) return true
  return !collapsedGroups.value.has(groupId)
}

function isActive(path: string) {
  return route.path.startsWith(path)
}

async function handleLogout() {
  await authSignOut()
  navigateTo('/login')
}
</script>
