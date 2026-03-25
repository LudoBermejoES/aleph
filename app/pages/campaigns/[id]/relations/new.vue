<template>
  <div class="p-8 max-w-3xl">
    <div class="flex items-center gap-2 text-sm text-muted-foreground mb-4">
      <NuxtLink :to="`/campaigns/${campaignId}`" class="hover:text-primary">Campaign</NuxtLink>
      <span>/</span>
      <NuxtLink :to="`/campaigns/${campaignId}/graph`" class="hover:text-primary">Graph</NuxtLink>
      <span>/</span><span>New Relation</span>
    </div>
    <h1 class="text-2xl font-bold mb-6">Create Relation</h1>
    <RelationForm v-model="form" :campaign-id="campaignId" submit-label="Create Relation" :submitting="submitting" @submit="create">
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
const submitting = ref(false)
const form = ref({
  sourceEntityId: '', sourceEntityName: '',
  targetEntityId: '', targetEntityName: '',
  forwardLabel: 'related to', reverseLabel: 'related to',
  relationTypeId: '', attitude: 0, description: '',
})

async function create() {
  submitting.value = true
  try {
    await $fetch(`/api/campaigns/${campaignId}/relations`, {
      method: 'POST',
      body: {
        sourceEntityId: form.value.sourceEntityId,
        targetEntityId: form.value.targetEntityId,
        forwardLabel: form.value.forwardLabel,
        reverseLabel: form.value.reverseLabel,
        relationTypeId: form.value.relationTypeId || undefined,
        attitude: form.value.attitude,
        description: form.value.description || undefined,
      },
    })
    await router.push(`/campaigns/${campaignId}/graph`)
  } catch (e: any) {
    alert(e.data?.message || 'Failed to create relation')
  } finally {
    submitting.value = false
  }
}
</script>
