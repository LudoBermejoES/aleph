<template>
  <div class="p-8 max-w-3xl">
    <div class="flex items-center gap-2 text-sm text-muted-foreground mb-4">
      <NuxtLink :to="`/campaigns/${campaignId}`" class="hover:text-primary">Campaign</NuxtLink>
      <span>/</span>
      <NuxtLink :to="`/campaigns/${campaignId}/characters`" class="hover:text-primary">Characters</NuxtLink>
      <span>/</span><span>New Character</span>
    </div>
    <h1 class="text-2xl font-bold mb-6">Create Character</h1>
    <CharacterForm v-model="form" :campaign-id="campaignId" submit-label="Create Character" :submitting="submitting" @submit="create">
      <template #cancel>
        <NuxtLink :to="`/campaigns/${campaignId}/characters`"><Button variant="outline">Cancel</Button></NuxtLink>
      </template>
    </CharacterForm>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const router = useRouter()
const campaignId = route.params.id as string
const submitting = ref(false)
const form = ref({
  name: '', characterType: 'npc', race: '', class: '', alignment: '',
  status: 'alive', visibility: 'members', content: '', ownerUserId: '',
})

async function create() {
  submitting.value = true
  try {
    const res = await $fetch(`/api/campaigns/${campaignId}/characters`, {
      method: 'POST', body: form.value,
    }) as any
    await router.push(`/campaigns/${campaignId}/characters/${res.slug}`)
  } catch (e: any) {
    alert(e.data?.message || 'Failed to create character')
  } finally {
    submitting.value = false
  }
}
</script>
