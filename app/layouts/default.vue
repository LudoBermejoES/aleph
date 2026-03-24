<template>
  <div class="flex h-screen bg-background text-foreground">
    <!-- Sidebar -->
    <aside class="w-64 border-r border-border bg-sidebar-background flex flex-col">
      <div class="p-4 border-b border-sidebar-border">
        <h1 class="text-xl font-bold text-sidebar-primary">Aleph</h1>
        <p class="text-xs text-sidebar-foreground/60">Campaign Manager</p>
      </div>
      <nav class="flex-1 p-2">
        <slot name="sidebar" />
      </nav>
    </aside>

    <!-- Main content -->
    <main class="flex-1 overflow-auto">
      <slot />
    </main>
  </div>
</template>
