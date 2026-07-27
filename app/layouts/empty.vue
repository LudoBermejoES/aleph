<template>
  <!-- `bg-background text-foreground` mirrors layouts/default.vue deliberately.
       Nothing in this app sets `color` on html/body — not Tailwind preflight, not
       main.css — so a layout that omits `text-foreground` leaves its whole subtree
       inheriting the UA default (black). That is invisible on the eight dark campaign
       themes: 1.06–1.28:1 against their --background. Every element in the subtree
       without its own `text-*` token depended on this class being here. -->
  <div class="bg-background text-foreground">
    <slot></slot>
  </div>
</template>
