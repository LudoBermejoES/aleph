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
          <!-- Mount/Companion indicator (7.8) -->
          <span v-if="calculatedAge !== null" class="text-xs text-muted-foreground ml-2" data-testid="character-age">
            Age: {{ calculatedAge }}
          </span>
          <p v-if="character.isCompanionOf" class="text-xs text-muted-foreground mt-1">
            Companion of another character
          </p>
        </div>
        <Button v-if="!editing" variant="outline" size="sm" data-testid="edit-character" @click="editing = true">Edit</Button>
        <div v-else class="flex gap-2">
          <Button size="sm" data-testid="save-character" @click="save">Save</Button>
          <Button variant="outline" size="sm" @click="editing = false">Cancel</Button>
        </div>
      </div>

      <!-- Edit Form (7.6) -->
      <div v-if="editing" class="mb-6 p-4 rounded-lg border border-border space-y-4" data-testid="character-edit-form">
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="text-sm font-medium">Name</label>
            <input v-model="editForm.name" class="w-full mt-1 px-3 py-2 rounded border border-input bg-background" />
          </div>
          <div>
            <label class="text-sm font-medium">Race</label>
            <input v-model="editForm.race" class="w-full mt-1 px-3 py-2 rounded border border-input bg-background" />
          </div>
          <div>
            <label class="text-sm font-medium">Class</label>
            <input v-model="editForm.class" class="w-full mt-1 px-3 py-2 rounded border border-input bg-background" />
          </div>
          <div>
            <label class="text-sm font-medium">Alignment</label>
            <input v-model="editForm.alignment" class="w-full mt-1 px-3 py-2 rounded border border-input bg-background" />
          </div>
          <div>
            <label class="text-sm font-medium">Status</label>
            <select v-model="editForm.status" class="w-full mt-1 px-3 py-2 rounded border border-input bg-background">
              <option value="alive">Alive</option>
              <option value="dead">Dead</option>
              <option value="missing">Missing</option>
              <option value="unknown">Unknown</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Stats -->
      <div v-if="character.stats?.length" class="mb-6" data-testid="character-stats">
        <h2 class="text-lg font-semibold mb-3">Stats</h2>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-2">
          <div v-for="stat in character.stats" :key="stat.id" class="p-2 rounded border border-border text-center">
            <div class="text-xs text-muted-foreground">{{ stat.defName }}</div>
            <div class="text-lg font-bold">{{ stat.value ?? (stat.defValueType === 'boolean' ? '—' : '0') }}</div>
          </div>
        </div>
      </div>

      <!-- Abilities -->
      <div v-if="character.abilities?.length" class="mb-6" data-testid="character-abilities">
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

      <!-- Connections (7.5) -->
      <div v-if="connections.length" class="mb-6" data-testid="character-connections">
        <h2 class="text-lg font-semibold mb-3">Connections</h2>
        <div class="space-y-2">
          <div v-for="conn in connections" :key="conn.id" class="flex items-center gap-2 p-2 rounded border border-border">
            <span class="font-medium">{{ conn.targetEntityName || conn.targetEntityId }}</span>
            <span v-if="conn.label" class="text-xs px-2 py-0.5 rounded bg-secondary text-secondary-foreground">{{ conn.label }}</span>
            <span v-if="conn.description" class="text-sm text-muted-foreground">{{ conn.description }}</span>
          </div>
        </div>
      </div>

      <!-- Companions/Mounts (7.8) -->
      <div v-if="companions.length" class="mb-6" data-testid="character-companions">
        <h2 class="text-lg font-semibold mb-3">Companions</h2>
        <div class="space-y-2">
          <NuxtLink
            v-for="comp in companions"
            :key="comp.id"
            :to="`/campaigns/${campaignId}/characters/${comp.slug}`"
            class="block p-3 rounded border border-border hover:border-primary/50 transition-colors"
          >
            <span class="font-medium">{{ comp.name }}</span>
            <span v-if="comp.race" class="text-xs ml-2 text-muted-foreground">{{ comp.race }}</span>
          </NuxtLink>
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
const connections = ref<any[]>([])
const companions = ref<any[]>([])
const editing = ref(false)
const editForm = ref({ name: '', race: '', class: '', alignment: '', status: 'alive' })

// Age calculation (7.1, 7.2)
const calculatedAge = computed(() => {
  if (!character.value?.frontmatter?.fields?.birthYear) return null
  const birth = {
    year: Number(character.value.frontmatter.fields.birthYear),
    month: Number(character.value.frontmatter.fields.birthMonth || 1),
    day: Number(character.value.frontmatter.fields.birthDay || 1),
  }
  const current = {
    year: Number(character.value.frontmatter?.fields?.currentYear || character.value.currentYear || 0),
    month: Number(character.value.frontmatter?.fields?.currentMonth || character.value.currentMonth || 1),
    day: Number(character.value.frontmatter?.fields?.currentDay || character.value.currentDay || 1),
  }
  if (!current.year) return null
  let age = current.year - birth.year
  if (current.month < birth.month || (current.month === birth.month && current.day < birth.day)) age--
  return Math.max(0, age)
})

async function load() {
  try {
    character.value = await $fetch(`/api/campaigns/${campaignId}/characters/${slug}`)
    editForm.value = {
      name: character.value.name || '',
      race: character.value.race || '',
      class: character.value.class || '',
      alignment: character.value.alignment || '',
      status: character.value.status || 'alive',
    }
  } catch {
    character.value = null
  }

  // Load connections
  try {
    connections.value = await $fetch(`/api/campaigns/${campaignId}/characters/${slug}/connections`) as any[]
  } catch {
    connections.value = []
  }

  // Load companions (characters where isCompanionOf = this character's id)
  try {
    const all = await $fetch(`/api/campaigns/${campaignId}/characters`, { params: { companionOf: character.value?.id } }) as any[]
    companions.value = all
  } catch {
    companions.value = []
  }
}

async function save() {
  try {
    await $fetch(`/api/campaigns/${campaignId}/characters/${slug}`, {
      method: 'PUT',
      body: editForm.value,
    })
    editing.value = false
    await load()
  } catch (e: any) {
    alert(e.data?.message || 'Failed to save')
  }
}

onMounted(load)
</script>
