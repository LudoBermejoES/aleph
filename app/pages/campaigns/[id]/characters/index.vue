<template>
  <div class="p-8">
    <div class="flex items-center gap-2 text-sm text-muted-foreground mb-1">
      <NuxtLink :to="`/campaigns/${campaignId}`" class="hover:text-primary">Campaign</NuxtLink>
      <span>/</span>
      <span>Characters</span>
    </div>

    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold">Characters</h1>
      <div class="flex gap-2">
        <NuxtLink :to="`/campaigns/${campaignId}/entities`">
          <Button variant="outline" size="sm">All Entities</Button>
        </NuxtLink>
        <Dialog v-model:open="showCreate">
          <DialogTrigger as-child><Button data-testid="new-character-btn">New Character</Button></DialogTrigger>
          <DialogContent class="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Create Character</DialogTitle></DialogHeader>
            <form @submit.prevent="createCharacter" class="space-y-4">
              <div class="grid grid-cols-2 gap-4">
                <div class="col-span-2">
                  <label class="text-sm font-medium">Name *</label>
                  <input v-model="form.name" required class="w-full mt-1 px-3 py-2 rounded border border-input bg-background" placeholder="Strahd von Zarovich" />
                </div>
                <div>
                  <label class="text-sm font-medium">Type</label>
                  <select v-model="form.characterType" class="w-full mt-1 px-3 py-2 rounded border border-input bg-background">
                    <option value="npc">NPC</option>
                    <option value="pc">PC</option>
                  </select>
                </div>
                <div>
                  <label class="text-sm font-medium">Status</label>
                  <select v-model="form.status" class="w-full mt-1 px-3 py-2 rounded border border-input bg-background">
                    <option value="alive">Alive</option>
                    <option value="dead">Dead</option>
                    <option value="missing">Missing</option>
                    <option value="unknown">Unknown</option>
                  </select>
                </div>
                <div>
                  <label class="text-sm font-medium">Race</label>
                  <input v-model="form.race" class="w-full mt-1 px-3 py-2 rounded border border-input bg-background" placeholder="Human, Elf, Dwarf..." />
                </div>
                <div>
                  <label class="text-sm font-medium">Class</label>
                  <input v-model="form.class" class="w-full mt-1 px-3 py-2 rounded border border-input bg-background" placeholder="Fighter, Wizard..." />
                </div>
                <div>
                  <label class="text-sm font-medium">Alignment</label>
                  <input v-model="form.alignment" class="w-full mt-1 px-3 py-2 rounded border border-input bg-background" placeholder="Lawful Good, Chaotic Evil..." />
                </div>
                <div>
                  <label class="text-sm font-medium">Visibility</label>
                  <select v-model="form.visibility" class="w-full mt-1 px-3 py-2 rounded border border-input bg-background">
                    <option value="members">Members</option>
                    <option value="public">Public</option>
                    <option value="editors">Editors</option>
                    <option value="dm_only">DM Only</option>
                    <option value="private">Private</option>
                  </select>
                </div>
              </div>
              <div>
                <label class="text-sm font-medium">Description</label>
                <MarkdownEditor v-model="form.content" placeholder="Write a description..." class="mt-1" />
              </div>
              <div class="flex justify-end gap-2">
                <Button type="button" variant="outline" @click="showCreate = false">Cancel</Button>
                <Button type="submit" :disabled="creating">{{ creating ? 'Creating...' : 'Create' }}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>

    <!-- PC/NPC Toggle -->
    <div class="flex gap-2 mb-6">
      <Button :variant="filter === 'all' ? 'default' : 'outline'" size="sm" @click="filter = 'all'; load()">All</Button>
      <Button :variant="filter === 'pc' ? 'default' : 'outline'" size="sm" @click="filter = 'pc'; load()">PCs</Button>
      <Button :variant="filter === 'npc' ? 'default' : 'outline'" size="sm" @click="filter = 'npc'; load()">NPCs</Button>
    </div>

    <div class="flex gap-6">
      <!-- NPC Folder Sidebar -->
      <aside v-if="filter === 'npc' && folders.length" class="w-48 shrink-0" data-testid="folder-sidebar">
        <h3 class="text-sm font-semibold mb-2">Folders</h3>
        <button
          class="block w-full text-left text-sm px-2 py-1 rounded mb-1 hover:bg-secondary"
          :class="{ 'bg-secondary font-medium': !selectedFolder }"
          @click="selectedFolder = ''; load()"
        >All NPCs</button>
        <button
          v-for="f in folders"
          :key="f.id"
          class="block w-full text-left text-sm px-2 py-1 rounded mb-1 hover:bg-secondary"
          :class="{ 'bg-secondary font-medium': selectedFolder === f.id }"
          @click="selectedFolder = f.id; load()"
        >{{ f.name }}</button>
      </aside>

      <!-- Character List -->
      <div class="flex-1">
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
                <span v-if="c.isCompanionOf" class="text-xs ml-1 text-muted-foreground italic">companion</span>
              </div>
              <span :class="['text-xs px-2 py-0.5 rounded', c.status === 'alive' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' : c.status === 'dead' ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' : 'bg-secondary text-secondary-foreground']">
                {{ c.status }}
              </span>
            </div>
          </NuxtLink>
        </div>
        <p v-else class="text-muted-foreground text-center py-8">No characters yet. Click "New Character" to create one.</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const router = useRouter()
const campaignId = route.params.id as string
const chars = ref<any[]>([])
const folders = ref<any[]>([])
const filter = ref('all')
const selectedFolder = ref('')
const showCreate = ref(false)
const creating = ref(false)
const form = ref({
  name: '', characterType: 'npc', race: '', class: '', alignment: '',
  status: 'alive', visibility: 'members', content: '',
})

async function createCharacter() {
  creating.value = true
  try {
    const res = await $fetch(`/api/campaigns/${campaignId}/characters`, {
      method: 'POST',
      body: form.value,
    }) as any
    showCreate.value = false
    form.value = { name: '', characterType: 'npc', race: '', class: '', alignment: '', status: 'alive', visibility: 'members', content: '' }
    await router.push(`/campaigns/${campaignId}/characters/${res.slug}`)
  } catch (e: any) {
    alert(e.data?.message || 'Failed to create character')
  } finally {
    creating.value = false
  }
}

async function load() {
  try {
    const params: Record<string, string> = {}
    if (filter.value !== 'all') params.type = filter.value
    if (selectedFolder.value) params.folderId = selectedFolder.value
    chars.value = await $fetch(`/api/campaigns/${campaignId}/characters`, { params }) as any[]
  } catch {
    chars.value = []
  }
}

async function loadFolders() {
  try {
    folders.value = await $fetch(`/api/campaigns/${campaignId}/character-folders`) as any[]
  } catch {
    folders.value = []
  }
}

onMounted(async () => {
  await Promise.all([load(), loadFolders()])
})
</script>
