<template>
  <!-- `bg-background` must be paired with `text-foreground`: layouts/default.vue
       mirrors the active campaign theme onto <html> and does not clear it when it
       unmounts, so arriving here from a themed campaign page (logging out, say)
       renders this layout on a dark background. Unpaired, its slotted content
       inherits the UA default black. -->
  <div class="min-h-screen flex items-center justify-center bg-background text-foreground">
    <div class="w-full max-w-md px-4">
      <div class="text-center mb-8">
        <img src="~/assets/logo/aleph.png" alt="Aleph" class="w-20 h-20 mx-auto mb-3" />
        <p class="text-muted-foreground">{{ $t('auth.tagline') }}</p>
      </div>
      <slot></slot>
    </div>
  </div>
</template>
