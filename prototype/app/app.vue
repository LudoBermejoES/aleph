<template>
  <div style="max-width: 900px; margin: 0 auto; padding: 2rem; font-family: system-ui, sans-serif;">
    <h1>Aleph Prototype</h1>
    <p style="color: #666;">Validates: Nuxt 4 + SQLite (Drizzle) + Markdown files + FTS5 + MDC rendering</p>

    <hr style="margin: 2rem 0;" />

    <!-- Create Entity Form -->
    <section>
      <h2>Create Entity</h2>
      <form @submit.prevent="createEntity">
        <div style="display: grid; gap: 0.5rem; max-width: 500px;">
          <input v-model="form.name" placeholder="Name (e.g. Strahd von Zarovich)" required />
          <input v-model="form.type" placeholder="Type (e.g. character, location)" required />
          <input v-model="form.aliases" placeholder="Aliases (comma-separated)" />
          <input v-model="form.tags" placeholder="Tags (comma-separated)" />
          <select v-model="form.visibility">
            <option value="public">Public</option>
            <option value="members">Members</option>
            <option value="editors">Editors</option>
            <option value="dm_only">DM Only</option>
          </select>
          <textarea v-model="form.content" rows="6" placeholder="Markdown content..."></textarea>
          <button type="submit">Create Entity</button>
        </div>
      </form>
      <p v-if="createResult" style="color: green;">Created: {{ createResult.slug }} ({{ createResult.id }})</p>
    </section>

    <hr style="margin: 2rem 0;" />

    <!-- Search -->
    <section>
      <h2>FTS5 Search</h2>
      <input v-model="searchQuery" placeholder="Search entities..." @input="doSearch" style="width: 100%; max-width: 500px;" />
      <div v-if="searchResults.length" style="margin-top: 1rem;">
        <div v-for="result in searchResults" :key="result.name" style="padding: 0.5rem; border-bottom: 1px solid #eee;">
          <strong>{{ result.name }}</strong>
          <span v-html="result.snippet" style="color: #666; margin-left: 0.5rem;"></span>
          <small style="color: #999; margin-left: 0.5rem;">score: {{ result.score?.toFixed(2) }}</small>
        </div>
      </div>
    </section>

    <hr style="margin: 2rem 0;" />

    <!-- Entity List -->
    <section>
      <h2>All Entities (from SQLite)</h2>
      <button @click="loadEntities">Refresh</button>
      <div v-for="entity in entityList" :key="entity.id" style="padding: 0.5rem; margin: 0.5rem 0; border: 1px solid #ddd; border-radius: 4px; cursor: pointer;" @click="loadEntity(entity.slug)">
        <strong>{{ entity.name }}</strong>
        <span style="color: #666; margin-left: 0.5rem;">{{ entity.type }}</span>
        <span style="color: #999; margin-left: 0.5rem;">{{ entity.visibility }}</span>
      </div>
      <p v-if="!entityList.length" style="color: #999;">No entities yet. Create one above.</p>
    </section>

    <hr style="margin: 2rem 0;" />

    <!-- MDC Rendered Content -->
    <section v-if="selectedEntity">
      <h2>{{ selectedEntity.name }} <small style="color: #999;">({{ selectedEntity.type }})</small></h2>
      <pre style="background: #f5f5f5; padding: 1rem; border-radius: 4px; font-size: 0.8rem;">{{ JSON.stringify(selectedEntity.frontmatter, null, 2) }}</pre>
      <h3>Rendered Markdown (MDC)</h3>
      <div style="background: #fafafa; padding: 1rem; border-radius: 4px;">
        <MDC :value="selectedEntity.content" />
      </div>
    </section>

    <hr style="margin: 2rem 0;" />

    <!-- Stack Validation Summary -->
    <section>
      <h2>Stack Validation</h2>
      <ul>
        <li>Nuxt 4.4 + Vue 3.5</li>
        <li>SQLite via better-sqlite3 (bridge until Drizzle node-sqlite ships)</li>
        <li>Drizzle ORM (typed queries, schema)</li>
        <li>FTS5 full-text search with BM25</li>
        <li>Markdown files on filesystem with YAML frontmatter</li>
        <li>gray-matter for frontmatter parsing</li>
        <li>@nuxtjs/mdc for runtime markdown rendering with Vue components</li>
        <li>Nitro API routes (file-based)</li>
        <li>WebSocket support (experimental, enabled)</li>
      </ul>
    </section>
  </div>
</template>

<script setup lang="ts">
const form = reactive({
  name: '',
  type: 'character',
  aliases: '',
  tags: '',
  visibility: 'members',
  content: '# Description\n\nA powerful **vampire lord** who rules over Barovia.\n\n## Abilities\n\n- Shapeshifting\n- Charm\n- Wall climbing',
})

const createResult = ref<{ id: string; slug: string } | null>(null)
const entityList = ref<any[]>([])
const selectedEntity = ref<any>(null)
const searchQuery = ref('')
const searchResults = ref<any[]>([])

async function createEntity() {
  const result = await $fetch('/api/entities', {
    method: 'POST',
    body: {
      name: form.name,
      type: form.type,
      campaignId: 'demo-campaign',
      content: form.content,
      visibility: form.visibility,
      aliases: form.aliases ? form.aliases.split(',').map(s => s.trim()) : [],
      tags: form.tags ? form.tags.split(',').map(s => s.trim()) : [],
    },
  })
  createResult.value = result as any
  form.name = ''
  form.aliases = ''
  form.tags = ''
  await loadEntities()
}

async function loadEntities() {
  entityList.value = await $fetch('/api/entities') as any[]
}

async function loadEntity(slug: string) {
  selectedEntity.value = await $fetch(`/api/entities/${slug}`)
}

async function doSearch() {
  if (!searchQuery.value.trim()) {
    searchResults.value = []
    return
  }
  const res = await $fetch('/api/search', { params: { q: searchQuery.value } }) as any
  searchResults.value = res.results
}

onMounted(() => {
  loadEntities()
})
</script>
