<template>
  <div class="p-8 max-w-3xl">
    <div class="flex items-center gap-2 text-sm text-muted-foreground mb-4">
      <NuxtLink :to="`/campaigns/${campaignId}`" class="hover:text-primary">Campaign</NuxtLink>
      <span>/</span>
      <NuxtLink :to="`/campaigns/${campaignId}/graph`" class="hover:text-primary">Graph</NuxtLink>
      <span>/</span><span>Edit Relation</span>
    </div>
    <h1 class="text-2xl font-bold mb-6">Edit Relation</h1>
    <RelationForm v-if="loaded" v-model="form" :campaign-id="campaignId" submit-label="Save Changes" :submitting="submitting" @submit="save">
      <template #cancel>
        <NuxtLink :to="`/campaigns/${campaignId}/graph`"><Button variant="outline">Cancel</Button></NuxtLink>
      </template>
    </RelationForm>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const router = useRouter()
const campaignId = route.params.id as string
const relationId = route.params.relationId as string
const submitting = ref(false)
const loaded = ref(false)
const form = ref({
  sourceEntityId: '', sourceEntityName: '',
  targetEntityId: '', targetEntityName: '',
  forwardLabel: 'related to', reverseLabel: 'related to',
  relationTypeId: '', attitude: 0, description: '',
})

const api = useCampaignApi(campaignId)

onMounted(async () => {
  try {
    const rel = await api.getRelation(relationId)
    form.value = {
      sourceEntityId: rel.sourceEntityId || '',
      sourceEntityName: rel.sourceEntityName || rel.sourceEntityId || '',
      targetEntityId: rel.targetEntityId || '',
      targetEntityName: rel.targetEntityName || rel.targetEntityId || '',
      forwardLabel: rel.forwardLabel || 'related to',
      reverseLabel: rel.reverseLabel || 'related to',
      relationTypeId: rel.relationTypeId || '',
      attitude: rel.attitude ?? 0,
      description: rel.description || '',
    }
    loaded.value = true
  } catch {
    alert('Failed to load relation')
    await router.push(`/campaigns/${campaignId}/graph`)
  }
})

async function save() {
  submitting.value = true
  try {
    await api.updateRelation(relationId, {
      forwardLabel: form.value.forwardLabel,
      reverseLabel: form.value.reverseLabel,
      relationTypeId: form.value.relationTypeId || undefined,
      attitude: form.value.attitude,
      description: form.value.description || undefined,
    })
    await router.push(`/campaigns/${campaignId}/graph`)
  } catch (e: any) {
    alert(e.data?.message || 'Failed to save')
  } finally {
    submitting.value = false
  }
}
</script>
