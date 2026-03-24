<template>
  <div class="flex h-screen bg-background text-foreground">
    <!-- Sidebar -->
    <aside class="w-64 border-r border-border bg-sidebar-background flex flex-col shrink-0">
      <NuxtLink to="/" class="block p-4 border-b border-sidebar-border hover:bg-sidebar-accent transition-colors">
        <h1 class="text-xl font-bold text-sidebar-primary">Aleph</h1>
        <p class="text-xs text-sidebar-foreground/60">Campaign Manager</p>
      </NuxtLink>
      <nav class="flex-1 p-2 space-y-1 overflow-auto">
        <NuxtLink
          to="/"
          class="block px-3 py-2 rounded text-sm text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
        >
          Campaigns
        </NuxtLink>
      </nav>
      <div class="p-3 border-t border-sidebar-border">
        <button @click="logout" class="text-xs text-muted-foreground hover:text-foreground transition-colors">
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
async function logout() {
  try {
    await $fetch('/api/auth/sign-out', { method: 'POST' })
  } catch {
    // ignore
  }
  navigateTo('/login')
}
</script>
