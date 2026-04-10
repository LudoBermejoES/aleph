<template>
  <div class="p-8 max-w-3xl">
    <div class="flex items-center gap-2 text-sm text-muted-foreground mb-4">
      <NuxtLink :to="`/campaigns/${campaignId}`" class="hover:text-primary">
        {{ $t('common.campaign') }}</NuxtLink
      >
      <span>/</span>
      <NuxtLink :to="`/campaigns/${campaignId}/entities`" class="hover:text-primary">{{
        $t('entities.title')
      }}</NuxtLink>
      <span>/</span>
      <NuxtLink :to="`/campaigns/${campaignId}/entities/${slug}`" class="hover:text-primary">{{
        form.name || 'Entity'
      }}</NuxtLink>
      <span>/</span><span>{{ $t('common.edit') }}</span>
    </div>
    <h1 class="text-2xl font-bold mb-6">{{ $t('entities.new') }}</h1>
    <div v-if="loaded" class="mb-6">
      <EntityImage
        :image-url="entityImageUrl"
        :name="form.name"
        :editable="true"
        :campaign-id="campaignId"
        :entity-slug="slug"
        size="lg"
        @uploaded="(url) => (entityImageUrl = url)"
      />
    </div>
    <EntityForm
      v-if="loaded"
      ref="entityForm"
      v-model="form"
      :campaign-id="campaignId"
      :entity-slug="slug"
      :submit-label="$t('common.save')"
      :submitting="submitting"
      :collaborative="isCollaborative"
      :document-name="documentName"
      :user-name="userName"
      :user-color="userColor"
      @submit="save"
    >
      <template #extra-fields>
        <div>
          <label class="text-sm font-medium">{{ $t('entities.boardSummary') }}</label>
          <input
            v-model="boardSummary"
            maxlength="120"
            class="w-full mt-1 px-3 py-2 rounded border border-input bg-background text-sm"
            :placeholder="$t('entities.boardSummaryPlaceholder')"
          />
          <p class="text-xs text-muted-foreground mt-1">
            {{ boardSummary.length }}/120 — {{ $t('entities.boardSummaryHint') }}
          </p>
        </div>
      </template>
      <template #cancel>
        <NuxtLink :to="`/campaigns/${campaignId}/entities/${slug}`"
          ><Button variant="outline">{{ $t('common.cancel') }}</Button></NuxtLink
        >
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
const form = ref({
  name: '',
  type: 'note',
  visibility: 'members',
  tagsRaw: '',
  content: '',
  templateId: '',
  templateFields: {} as Record<string, unknown>,
})
const boardSummary = ref('')
const entityImageUrl = ref<string | null>(null)

const isCollaborative = computed(() => route.query.collab === 'true')
const documentName = computed(() =>
  isCollaborative.value ? `campaign:${campaignId}:entity:${slug}` : undefined,
)
const { userName, userColor } = useCollaborationUser()

const api = useCampaignApi(campaignId)
const entityForm = ref<{ clearDraft: () => void } | null>(null)

onMounted(async () => {
  try {
    const entity = await api.getEntity(slug)
    entityImageUrl.value = entity.imageUrl ?? null
    boardSummary.value = entity.boardSummary ?? ''
    form.value = {
      name: entity.name || '',
      type: entity.type || 'note',
      visibility: entity.visibility || 'members',
      tagsRaw: (entity.frontmatter?.tags || []).join(', '),
      content: entity.content || '',
      templateId: entity.templateId || '',
      templateFields: (entity.fields as Record<string, unknown>) || {},
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
    const tags = form.value.tagsRaw
      .split(',')
      .map((t: string) => t.trim())
      .filter(Boolean)
    await api.updateEntity(slug, {
      ...form.value,
      tags,
      boardSummary: boardSummary.value || null,
      templateId: form.value.templateId || undefined,
      fields: form.value.templateFields,
    })
    entityForm.value?.clearDraft()
    await router.push(`/campaigns/${campaignId}/entities/${slug}`)
  } catch (e: unknown) {
    const err = e as { data?: { message?: string } }
    alert(err.data?.message || t('entities.failedSave'))
  } finally {
    submitting.value = false
  }
}
</script>
