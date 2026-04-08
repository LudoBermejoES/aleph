<template>
  <select
    :value="locale"
    class="text-xs bg-transparent text-sidebar-foreground/70 hover:text-sidebar-foreground border border-sidebar-border rounded px-1 py-0.5 cursor-pointer transition-colors"
    @change="setLocale(($event.target as HTMLSelectElement).value)"
  >
    <option v-for="loc in locales" :key="loc.code" :value="loc.code">
      {{ loc.name }}
    </option>
  </select>
</template>

<script setup lang="ts">
const { locale, locales, setLocale } = useI18n()
</script>
