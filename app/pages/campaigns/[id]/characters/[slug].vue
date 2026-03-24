<template>
  <div class="p-8">
    <div v-if="character">
      <div class="flex items-center gap-2 text-sm text-muted-foreground mb-4">
        <NuxtLink :to="`/campaigns/${campaignId}`" class="hover:text-primary">Campaign</NuxtLink>
        <span>/</span>
        <NuxtLink :to="`/campaigns/${campaignId}/characters`" class="hover:text-primary">Characters</NuxtLink>
        <span>/</span>
        <span class="text-foreground">{{ character.name }}</span>
      </div>

      <div class="flex items-start justify-between mb-6">
        <div>
          <h1 class="text-3xl font-bold">{{ character.name }}</h1>
          <div class="flex items-center gap-2 mt-2">
            <span class="text-xs px-2 py-1 rounded bg-secondary text-secondary-foreground">{{ character.characterType }}</span>
            <span v-if="character.race" class="text-xs px-2 py-1 rounded bg-secondary text-secondary-foreground">{{ character.race }}</span>
            <span v-if="character.class" class="text-xs px-2 py-1 rounded bg-secondary text-secondary-foreground">{{ character.class }}</span>
            <span v-if="character.alignment" class="text-xs text-muted-foreground">{{ character.alignment }}</span>
            <span :class="['text-xs px-2 py-1 rounded', character.status === 'alive' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300']">
              {{ character.status }}
            </span>
          </div>
        </div>
      </div>

      <!-- Stats -->
      <div v-if="character.stats?.length" class="mb-6">
        <h2 class="text-lg font-semibold mb-3">Stats</h2>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-2">
          <div v-for="stat in character.stats" :key="stat.id" class="p-2 rounded border border-border text-center">
            <div class="text-xs text-muted-foreground">{{ stat.defName }}</div>
            <div class="text-lg font-bold">{{ stat.value ?? stat.defValueType === 'boolean' ? '—' : '0' }}</div>
          </div>
        </div>
      </div>

      <!-- Abilities -->
      <div v-if="character.abilities?.length" class="mb-6">
        <h2 class="text-lg font-semibold mb-3">Abilities</h2>
        <div class="space-y-2">
          <div v-for="ab in character.abilities" :key="ab.id" class="p-3 rounded border border-border">
            <div class="flex items-center gap-2">
              <span class="font-medium">{{ ab.name }}</span>
              <span class="text-xs px-2 py-0.5 rounded bg-secondary text-secondary-foreground">{{ ab.type }}</span>
            </div>
            <p v-if="ab.description" class="text-sm text-muted-foreground mt-1">{{ ab.description }}</p>
          </div>
        </div>
      </div>

      <!-- Markdown Content -->
      <div class="prose dark:prose-invert max-w-none">
        <MDC v-if="character.content" :value="character.content" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const campaignId = route.params.id as string
const slug = route.params.slug as string
const character = ref<any>(null)

async function load() {
  try {
    character.value = await $fetch(`/api/campaigns/${campaignId}/characters/${slug}`)
  } catch {
    character.value = null
  }
}

onMounted(load)
</script>
