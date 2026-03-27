<template>
  <div class="p-8 max-w-3xl">
    <div class="flex items-center gap-2 text-sm text-muted-foreground mb-4">
      <NuxtLink :to="`/campaigns/${campaignId}`" class="hover:text-primary">Campaign</NuxtLink>
      <span>/</span>
      <NuxtLink :to="`/campaigns/${campaignId}/entities`" class="hover:text-primary">{{ $t('entities.title') }}</NuxtLink>
      <span>/</span>
      <NuxtLink :to="`/campaigns/${campaignId}/entities/${slug}`" class="hover:text-primary">{{ form.name || 'Entity' }}</NuxtLink>
      <span>/</span><span>{{ $t('common.edit') }}</span>
    </div>
    <h1 class="text-2xl font-bold mb-6">{{ $t('entities.new') }}</h1>
    <EntityForm ref="entityForm" v-if="loaded" v-model="form" :campaign-id="campaignId" :entity-slug="slug" :submit-label="$t('common.save')" :submitting="submitting" @submit="save">
      <template #cancel>
        <NuxtLink :to="`/campaigns/${campaignId}/entities/${slug}`"><Button variant="outline">{{ $t('common.cancel') }}</Button></NuxtLink>
      </template>
    </EntityForm>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const router = useRouter()
const campaignId = route.params.id as string
const slug = route.params.slug as string
const submitting = ref(false)
const loaded = ref(false)
const { t } = useI18n()
const form = ref({ name: '', type: 'note', visibility: 'members', tagsRaw: '', content: '' })

const api = useCampaignApi(campaignId)
const entityForm = ref<any>(null)

onMounted(async () => {
  try {
    const entity = await api.getEntity(slug)
    form.value = {
      name: entity.name || '',
      type: entity.type || 'note',
      visibility: entity.visibility || 'members',
      tagsRaw: (entity.frontmatter?.tags || []).join(', '),
      content: entity.content || '',
    }
    loaded.value = true
  } catch {
    alert(t('errors.failedLoad'))
    await router.push(`/campaigns/${campaignId}/entities/${slug}`)
  }
})

async function save() {
  submitting.value = true
  try {
    const tags = form.value.tagsRaw.split(',').map((t: string) => t.trim()).filter(Boolean)
    await api.updateEntity(slug, { ...form.value, tags })
    entityForm.value?.clearDraft()
    await router.push(`/campaigns/${campaignId}/entities/${slug}`)
  } catch (e: any) {
    alert(e.data?.message || t('entities.failedSave'))
  } finally {
    submitting.value = false
  }
}
</script>
