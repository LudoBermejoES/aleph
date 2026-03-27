<template>
  <div class="flex h-screen bg-background text-foreground" :data-theme="campaignTheme || undefined">
    <!-- Sidebar -->
    <aside class="w-64 border-r border-border bg-sidebar-background flex flex-col shrink-0">
      <NuxtLink to="/" class="block p-4 border-b border-sidebar-border hover:bg-sidebar-accent transition-colors">
        <h1 class="text-xl font-bold text-sidebar-primary">{{ $t('layout.appName') }}</h1>
        <p class="text-xs text-sidebar-foreground/60">{{ $t('layout.appSubtitle') }}</p>
      </NuxtLink>

      <nav class="flex-1 p-2 space-y-1 overflow-auto">
        <!-- Campaign sidebar when inside a campaign -->
        <template v-if="campaignId">
          <div class="flex items-center justify-between px-3 py-1">
            <p v-if="campaignName" class="text-xs font-semibold text-sidebar-foreground/70 uppercase tracking-wider">{{ campaignName }}</p>
            <PresenceAvatars :users="presenceUsers" :max-visible="4" />
          </div>
          <NuxtLink :to="`/campaigns/${campaignId}`"
            class="block px-3 py-2 rounded text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent transition-colors">
            {{ $t('layout.dashboard') }}
          </NuxtLink>
          <NuxtLink v-for="link in campaignLinks" :key="link.to" :to="link.to"
            :class="['block px-3 py-2 rounded text-sm text-sidebar-foreground hover:bg-sidebar-accent transition-colors', isActive(link.to) ? 'bg-sidebar-accent font-medium' : '']">
            {{ link.label }}
          </NuxtLink>
          <div class="border-t border-sidebar-border my-2" />
        </template>

        <NuxtLink to="/"
          class="block px-3 py-2 rounded text-sm text-sidebar-foreground hover:bg-sidebar-accent transition-colors">
          {{ $t('layout.allCampaigns') }}
        </NuxtLink>
      </nav>

      <!-- User info + sign out -->
      <div class="p-3 border-t border-sidebar-border">
        <p v-if="userName" class="text-xs text-muted-foreground mb-1">{{ userName }}</p>
        <div class="flex items-center justify-between mt-1">
          <div class="flex items-center gap-3">
            <button @click="handleLogout" class="text-xs text-muted-foreground hover:text-foreground transition-colors">
              {{ $t('auth.signOut') }}
            </button>
            <NuxtLink to="/settings" class="text-xs text-muted-foreground hover:text-foreground transition-colors">
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

const campaignLinks = computed(() => {
  if (!campaignId.value) return []
  const id = campaignId.value
  return [
    { to: `/campaigns/${id}/entities`, label: t('layout.wiki') },
    { to: `/campaigns/${id}/characters`, label: t('layout.characters') },
    { to: `/campaigns/${id}/organizations`, label: t('layout.organizations') },
    { to: `/campaigns/${id}/maps`, label: t('layout.maps') },
    { to: `/campaigns/${id}/sessions`, label: t('layout.sessions') },
    { to: `/campaigns/${id}/quests`, label: t('layout.quests') },
    { to: `/campaigns/${id}/calendars`, label: t('layout.calendars') },
    { to: `/campaigns/${id}/items`, label: t('layout.items') },
    { to: `/campaigns/${id}/shops`, label: t('layout.shops') },
    { to: `/campaigns/${id}/inventories`, label: t('layout.inventories') },
    { to: `/campaigns/${id}/currencies`, label: t('layout.currencies') },
    { to: `/campaigns/${id}/transactions`, label: t('layout.transactions') },
    { to: `/campaigns/${id}/graph`, label: t('layout.graph') },
    { to: `/campaigns/${id}/members`, label: t('layout.members') },
  ]
})

function isActive(path: string) {
  return route.path.startsWith(path)
}

async function handleLogout() {
  await authSignOut()
  navigateTo('/login')
}
</script>
