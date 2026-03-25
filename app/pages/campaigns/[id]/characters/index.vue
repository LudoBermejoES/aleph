<template>
  <div class="p-8">
    <div class="flex items-center gap-2 text-sm text-muted-foreground mb-1">
      <NuxtLink :to="`/campaigns/${campaignId}`" class="hover:text-primary">Campaign</NuxtLink>
      <span>/</span>
      <span>Characters</span>
    </div>

    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold">Characters</h1>
      <NuxtLink :to="`/campaigns/${campaignId}/entities`">
        <Button variant="outline" size="sm">All Entities</Button>
      </NuxtLink>
    </div>

    <!-- PC/NPC Toggle -->
    <div class="flex gap-2 mb-6">
      <Button :variant="filter === 'all' ? 'default' : 'outline'" size="sm" @click="filter = 'all'; load()">All</Button>
      <Button :variant="filter === 'pc' ? 'default' : 'outline'" size="sm" @click="filter = 'pc'; load()">PCs</Button>
      <Button :variant="filter === 'npc' ? 'default' : 'outline'" size="sm" @click="filter = 'npc'; load()">NPCs</Button>
    </div>

    <div v-if="chars.length" class="space-y-2">
      <NuxtLink
        v-for="c in chars"
        :key="c.id"
        :to="`/campaigns/${campaignId}/characters/${c.slug}`"
        class="block p-4 rounded-lg border border-border hover:border-primary/50 transition-colors"
      >
        <div class="flex items-center justify-between">
          <div>
            <span class="font-medium">{{ c.name }}</span>
            <span class="text-xs ml-2 px-2 py-0.5 rounded bg-secondary text-secondary-foreground">{{ c.characterType }}</span>
            <span v-if="c.race" class="text-xs ml-1 text-muted-foreground">{{ c.race }}</span>
            <span v-if="c.class" class="text-xs ml-1 text-muted-foreground">{{ c.class }}</span>
          </div>
          <span :class="['text-xs px-2 py-0.5 rounded', c.status === 'alive' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' : c.status === 'dead' ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' : 'bg-secondary text-secondary-foreground']">
            {{ c.status }}
          </span>
        </div>
      </NuxtLink>
    </div>
    <p v-else class="text-muted-foreground text-center py-8">No characters yet.</p>
  </div>
</template>

<script setup lang="ts">

const route = useRoute()
const campaignId = route.params.id as string
const chars = ref<any[]>([])
const filter = ref('all')

async function load() {
  try {
    const params: Record<string, string> = {}
    if (filter.value !== 'all') params.type = filter.value
    chars.value = await $fetch(`/api/campaigns/${campaignId}/characters`, { params }) as any[]
  } catch {
    chars.value = []
  }
}

onMounted(load)
</script>
