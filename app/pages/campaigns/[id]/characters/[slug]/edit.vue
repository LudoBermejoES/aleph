<template>
  <div class="p-8 max-w-3xl">
    <div class="flex items-center gap-2 text-sm text-muted-foreground mb-4">
      <NuxtLink :to="`/campaigns/${campaignId}`" class="hover:text-primary">Campaign</NuxtLink>
      <span>/</span>
      <NuxtLink :to="`/campaigns/${campaignId}/characters`" class="hover:text-primary">Characters</NuxtLink>
      <span>/</span>
      <NuxtLink :to="`/campaigns/${campaignId}/characters/${slug}`" class="hover:text-primary">{{ form.name || 'Character' }}</NuxtLink>
      <span>/</span><span>Edit</span>
    </div>
    <h1 class="text-2xl font-bold mb-6">Edit Character</h1>
    <CharacterForm v-if="loaded" v-model="form" :campaign-id="campaignId" submit-label="Save Changes" :submitting="submitting" @submit="save">
      <template #cancel>
        <NuxtLink :to="`/campaigns/${campaignId}/characters/${slug}`"><Button variant="outline">Cancel</Button></NuxtLink>
      </template>
    </CharacterForm>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const router = useRouter()
const campaignId = route.params.id as string
const slug = route.params.slug as string
const submitting = ref(false)
const loaded = ref(false)
const form = ref({
  name: '', characterType: 'npc', race: '', class: '', alignment: '',
  status: 'alive', visibility: 'members', content: '', ownerUserId: '',
})

const api = useCampaignApi(campaignId)

onMounted(async () => {
  try {
    const char = await api.getCharacter(slug)
    form.value = {
      name: char.name || '',
      characterType: char.characterType || 'npc',
      race: char.race || '',
      class: char.class || '',
      alignment: char.alignment || '',
      status: char.status || 'alive',
      visibility: char.visibility || 'members',
      content: char.content || '',
      ownerUserId: char.ownerUserId || '',
    }
    loaded.value = true
  } catch {
    alert('Failed to load character')
    await router.push(`/campaigns/${campaignId}/characters/${slug}`)
  }
})

async function save() {
  submitting.value = true
  try {
    await api.updateCharacter(slug, form.value)
    await router.push(`/campaigns/${campaignId}/characters/${slug}`)
  } catch (e: any) {
    alert(e.data?.message || 'Failed to save')
  } finally {
    submitting.value = false
  }
}
</script>
