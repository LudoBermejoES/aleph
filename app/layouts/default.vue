<template>
  <div class="flex h-screen bg-background text-foreground" :data-theme="campaignTheme || undefined">

    <!-- Mobile top bar (visible below md) -->
    <div class="md:hidden fixed top-0 left-0 right-0 z-40 h-14 flex items-center gap-3 px-4 border-b border-border bg-sidebar-background">
      <Sheet v-model:open="sidebarOpen">
        <SheetTrigger as-child>
          <button :aria-label="$t('layout.openMenu')" class="p-1 rounded hover:bg-sidebar-accent transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 text-sidebar-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </SheetTrigger>
        <SheetContent side="left" class="p-0 w-64 bg-sidebar-background border-sidebar-border">
          <SidebarNav
            :campaign-id="campaignId"
            :campaign-name="campaignName"
            :user-name="userName"
            :presence-users="presenceUsers"
            :campaign-link-groups="campaignLinkGroups"
            :collapsed-groups="collapsedGroups"
            @logout="handleLogout"
            @toggle-group="toggleGroup"
          />
        </SheetContent>
      </Sheet>
      <NuxtLink to="/" class="flex items-center gap-2">
        <img src="~/assets/logo/aleph.png" alt="Aleph" class="w-7 h-7 shrink-0" />
        <span class="font-bold text-sidebar-primary">{{ $t('layout.appName') }}</span>
      </NuxtLink>
    </div>

    <!-- Desktop sidebar (hidden below md) -->
    <aside class="hidden md:flex w-64 border-r border-border bg-sidebar-background flex-col shrink-0">
      <SidebarNav
        :campaign-id="campaignId"
        :campaign-name="campaignName"
        :user-name="userName"
        :presence-users="presenceUsers"
        :campaign-link-groups="campaignLinkGroups"
        :collapsed-groups="collapsedGroups"
        @logout="handleLogout"
        @toggle-group="toggleGroup"
      />
    </aside>

    <!-- Main content -->
    <main class="flex-1 overflow-auto pt-14 md:pt-0">
      <slot />
    </main>

    <!-- Global search — available on all campaign pages via Ctrl+K -->
    <SearchCommand v-if="campaignId" :campaign-id="campaignId" />
  </div>
</template>

<script setup lang="ts">
import { authSignOut } from '~/composables/useAuth'
import { ICONS } from '~/utils/icons'
import { Sheet, SheetContent, SheetTrigger } from '~/components/ui/sheet'

const { t } = useI18n()
const route = useRoute()

const userName = ref('')
const campaignName = ref('')
const sidebarOpen = ref(false)
// Shared state so campaign pages can update theme without full reload
const campaignTheme = useState<string | null>('campaignTheme', () => null)

const campaignId = computed(() => {
  const match = route.path.match(/^\/campaigns\/([^/]+)/)
  return match ? match[1] : undefined
})

// Close sidebar on route change
watch(() => route.path, () => {
  sidebarOpen.value = false
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
        { to: `/campaigns/${id}/arcs`, label: t('layout.arcs'), icon: ICONS.arcs },
        { to: `/campaigns/${id}/templates`, label: t('layout.templates'), icon: ICONS.templates },
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

async function handleLogout() {
  await authSignOut()
  navigateTo('/login')
}
</script>
