<template>
  <div class="p-8">
    <div class="flex items-center gap-2 text-sm text-muted-foreground mb-1">
      <NuxtLink :to="`/campaigns/${campaignId}`" class="hover:text-primary">Campaign</NuxtLink>
      <span>/</span>
      <span>Quests</span>
    </div>

    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold">Quests</h1>
      <Dialog v-model:open="showCreate">
        <DialogTrigger as-child>
          <Button>New Quest</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Quest</DialogTitle></DialogHeader>
          <form @submit.prevent="create" class="space-y-4">
            <Input v-model="form.name" placeholder="Quest name" required />
            <textarea v-model="form.description" rows="3" class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="Description..." />
            <div class="flex justify-end gap-2">
              <Button type="button" variant="outline" @click="showCreate = false">Cancel</Button>
              <Button type="submit">Create</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>

    <div class="flex gap-2 mb-6">
      <Button :variant="filter === '' ? 'default' : 'outline'" size="sm" @click="filter = ''; load()">All</Button>
      <Button :variant="filter === 'active' ? 'default' : 'outline'" size="sm" @click="filter = 'active'; load()">Active</Button>
      <Button :variant="filter === 'completed' ? 'default' : 'outline'" size="sm" @click="filter = 'completed'; load()">Completed</Button>
    </div>

    <div v-if="questList.length" class="space-y-2">
      <div v-for="q in rootQuests" :key="q.id" class="space-y-1">
        <div class="p-3 rounded-lg border border-border">
          <div class="flex items-center justify-between">
            <span class="font-medium">{{ q.name }}</span>
            <span :class="['text-xs px-2 py-0.5 rounded', q.status === 'active' ? 'bg-blue-100 text-blue-700' : q.status === 'completed' ? 'bg-green-100 text-green-700' : q.status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-secondary text-secondary-foreground']">
              {{ q.status }}
            </span>
          </div>
          <p v-if="q.description" class="text-sm text-muted-foreground mt-1">{{ q.description }}</p>
        </div>
        <!-- Sub-quests -->
        <div v-for="sub in childQuests(q.id)" :key="sub.id" class="ml-6 p-2 rounded border border-border/50 text-sm">
          <span>{{ sub.name }}</span>
          <span :class="['text-xs ml-2 px-1.5 py-0.5 rounded', sub.status === 'active' ? 'bg-blue-50 text-blue-600' : 'bg-secondary text-secondary-foreground']">{{ sub.status }}</span>
        </div>
      </div>
    </div>
    <p v-else class="text-muted-foreground text-center py-8">No quests yet.</p>
  </div>
</template>

<script setup lang="ts">

const route = useRoute()
const campaignId = route.params.id as string
const questList = ref<any[]>([])
const showCreate = ref(false)
const filter = ref('')
const form = reactive({ name: '', description: '' })

const rootQuests = computed(() => questList.value.filter(q => !q.parentQuestId))
function childQuests(parentId: string) { return questList.value.filter(q => q.parentQuestId === parentId) }

async function load() {
  try {
    const params: Record<string, string> = {}
    if (filter.value) params.status = filter.value
    questList.value = await $fetch(`/api/campaigns/${campaignId}/quests`, { params }) as any[]
  } catch { questList.value = [] }
}

async function create() {
  try {
    await $fetch(`/api/campaigns/${campaignId}/quests`, { method: 'POST', body: form })
    showCreate.value = false
    form.name = ''
    form.description = ''
    await load()
  } catch (e: any) { alert(e.data?.message || 'Failed') }
}

onMounted(load)
</script>
