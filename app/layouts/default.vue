<template>
  <div class="flex h-screen bg-background text-foreground">
    <!-- Sidebar -->
    <aside class="w-64 border-r border-border bg-sidebar-background flex flex-col shrink-0">
      <NuxtLink to="/" class="block p-4 border-b border-sidebar-border hover:bg-sidebar-accent transition-colors">
        <h1 class="text-xl font-bold text-sidebar-primary">Aleph</h1>
        <p class="text-xs text-sidebar-foreground/60">Campaign Manager</p>
      </NuxtLink>

      <nav class="flex-1 p-2 space-y-1 overflow-auto">
        <!-- Campaign sidebar when inside a campaign -->
        <template v-if="campaignId">
          <NuxtLink :to="`/campaigns/${campaignId}`"
            class="block px-3 py-2 rounded text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent transition-colors">
            Dashboard
          </NuxtLink>
          <NuxtLink v-for="link in campaignLinks" :key="link.to" :to="link.to"
            :class="['block px-3 py-2 rounded text-sm text-sidebar-foreground hover:bg-sidebar-accent transition-colors', isActive(link.to) ? 'bg-sidebar-accent font-medium' : '']">
            {{ link.label }}
          </NuxtLink>
          <div class="border-t border-sidebar-border my-2" />
        </template>

        <NuxtLink to="/"
          class="block px-3 py-2 rounded text-sm text-sidebar-foreground hover:bg-sidebar-accent transition-colors">
          All Campaigns
        </NuxtLink>
      </nav>

      <!-- User info + sign out -->
      <div class="p-3 border-t border-sidebar-border">
        <p v-if="userName" class="text-xs text-muted-foreground mb-1">{{ userName }}</p>
        <button @click="handleLogout" class="text-xs text-muted-foreground hover:text-foreground transition-colors">
          Sign Out
        </button>
      </div>
    </aside>

    <!-- Main content -->
    <main class="flex-1 overflow-auto">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
import { authSignOut } from '~/composables/useAuth'

const route = useRoute()

const userName = ref('')

const campaignId = computed(() => {
  const match = route.path.match(/^\/campaigns\/([^/]+)/)
  return match ? match[1] : null
})

const campaignLinks = computed(() => {
  if (!campaignId.value) return []
  const id = campaignId.value
  return [
    { to: `/campaigns/${id}/entities`, label: 'Wiki' },
    { to: `/campaigns/${id}/characters`, label: 'Characters' },
    { to: `/campaigns/${id}/maps`, label: 'Maps' },
    { to: `/campaigns/${id}/sessions`, label: 'Sessions' },
    { to: `/campaigns/${id}/quests`, label: 'Quests' },
    { to: `/campaigns/${id}/calendars`, label: 'Calendars' },
    { to: `/campaigns/${id}/items`, label: 'Items' },
    { to: `/campaigns/${id}/shops`, label: 'Shops' },
    { to: `/campaigns/${id}/graph`, label: 'Graph' },
    { to: `/campaigns/${id}/members`, label: 'Members' },
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
