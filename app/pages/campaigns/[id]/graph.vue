<template>
  <div class="p-8">
    <div class="flex items-center gap-2 text-sm text-muted-foreground mb-1">
      <NuxtLink :to="`/campaigns/${campaignId}`" class="hover:text-primary">Campaign</NuxtLink>
      <span>/</span>
      <span>Relationship Graph</span>
    </div>

    <h1 class="text-2xl font-bold mb-6">Relationship Graph</h1>

    <div v-if="graphData && Object.keys(graphData.nodes).length" class="border border-border rounded-lg" style="height: 600px;">
      <!-- v-network-graph would go here; for now show a structured list -->
      <div class="p-4 h-full overflow-auto">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div v-for="(edge, edgeId) in graphData.edges" :key="edgeId" class="p-3 rounded border border-border">
            <div class="flex items-center gap-2">
              <span class="font-medium">{{ graphData.nodes[edge.source]?.name || 'Unknown' }}</span>
              <span :style="{ color: edge.color }" class="text-sm">→ {{ edge.label }} →</span>
              <span class="font-medium">{{ graphData.nodes[edge.target]?.name || 'Unknown' }}</span>
            </div>
            <div v-if="edge.attitude" class="text-xs text-muted-foreground mt-1">
              Attitude: {{ edge.attitude }}
            </div>
          </div>
        </div>
      </div>
    </div>
    <p v-else class="text-muted-foreground text-center py-16">No relationships yet. Create connections between entities to see the graph.</p>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const campaignId = route.params.id as string
const graphData = ref<any>(null)

async function load() {
  try { graphData.value = await $fetch(`/api/campaigns/${campaignId}/graph`) } catch { graphData.value = null }
}

onMounted(load)
</script>
