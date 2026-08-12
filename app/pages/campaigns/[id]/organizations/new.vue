<template>
  <div class="p-8 max-w-2xl">
    <div class="flex items-center gap-2 text-sm text-muted-foreground mb-4">
      <NuxtLink :to="`/campaigns/${campaignId}`" class="hover:text-primary">
        {{ $t('common.campaign') }}</NuxtLink
      >
      <span>/</span>
      <NuxtLink :to="`/campaigns/${campaignId}/organizations`" class="hover:text-primary">{{
        $t('organizations.title')
      }}</NuxtLink>
      <span>/</span>
      <span>{{ $t('organizations.new') }}</span>
    </div>
    <h1 class="text-2xl font-bold mb-6">{{ $t('organizations.new') }}</h1>

    <form class="space-y-4" @submit.prevent="create">
      <div>
        <label class="block text-sm font-medium mb-1">{{ $t('organizations.name') }}</label>
        <input
          v-model="form.name"
          type="text"
          class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          :placeholder="$t('organizations.namePlaceholder')"
          required
        />
        <p v-if="nameError" class="text-destructive text-xs mt-1">{{ nameError }}</p>
      </div>

      <div>
        <label class="block text-sm font-medium mb-1">{{ $t('organizations.type') }}</label>
        <select
          v-model="form.type"
          class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <!-- eslint-disable-next-line vue/no-template-shadow -->
          <option v-for="t in types" :key="t" :value="t">
            {{ $t(`organizations.types.${t}`) }}
          </option>
        </select>
      </div>

      <div>
        <label class="block text-sm font-medium mb-1">{{ $t('organizations.status') }}</label>
        <select
          v-model="form.status"
          class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option v-for="s in statuses" :key="s" :value="s">
            {{ $t(`organizations.statuses.${s}`) }}
          </option>
        </select>
      </div>

      <div>
        <label class="block text-sm font-medium mb-1">{{ $t('organizations.visibility') }}</label>
        <select
          v-model="form.visibility"
          class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="members">{{ $t('characters.visibilityMembers') }}</option>
          <option value="public">{{ $t('characters.visibilityPublic') }}</option>
          <option value="editors">{{ $t('characters.visibilityEditors') }}</option>
          <option value="dm_only">{{ $t('characters.visibilityDmOnly') }}</option>
          <option value="private">{{ $t('characters.visibilityPrivate') }}</option>
        </select>
      </div>

      <div>
        <label class="block text-sm font-medium mb-1">{{ $t('organizations.description') }}</label>
        <textarea
          v-model="form.description"
          rows="4"
          class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          :placeholder="$t('organizations.descriptionPlaceholder')"
        ></textarea>
      </div>

      <!-- Template selector -->
      <div v-if="orgTemplates.length">
        <label class="block text-sm font-medium mb-1">{{ $t('templates.noTemplate') }}</label>
        <select
          v-model="form.templateId"
          class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">{{ $t('templates.noTemplate') }}</option>
          <option v-for="tpl in orgTemplates" :key="tpl.id" :value="tpl.id">{{ tpl.name }}</option>
        </select>
      </div>

      <!-- Template fields -->
      <TemplateFieldsForm
        v-if="form.templateId"
        :campaign-id="campaignId"
        :template-id="form.templateId"
        :model-value="form.templateFields"
        @update:model-value="(vals: Record<string, unknown>) => (form.templateFields = vals)"
      />

      <div class="flex gap-2">
        <Button type="submit" :disabled="submitting">{{ $t('common.create') }}</Button>
        <NuxtLink :to="`/campaigns/${campaignId}/organizations`">
          <Button variant="outline" type="button">{{ $t('common.cancel') }}</Button>
        </NuxtLink>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const router = useRouter()
const campaignId = route.params.id as string
const { t } = useI18n()
const api = useCampaignApi(campaignId)

interface OrgTemplate {
  id: string
  name: string
  entityTypeSlug: string
  isDefault: boolean
}

const types = ['faction', 'guild', 'army', 'cult', 'government', 'other']
const statuses = ['active', 'inactive', 'secret', 'dissolved']

const form = ref({
  name: '',
  type: 'faction',
  status: 'active',
  visibility: 'members',
  description: '',
  templateId: '',
  templateFields: {} as Record<string, unknown>,
})
const submitting = ref(false)
const nameError = ref('')
const orgTemplates = ref<OrgTemplate[]>([])

onMounted(async () => {
  try {
    const templates = await api.getTemplates()
    orgTemplates.value = (templates as OrgTemplate[]).filter(
      (t) => t.entityTypeSlug === 'organization',
    )
    const defaultTpl = orgTemplates.value.find((t) => t.isDefault)
    if (defaultTpl) form.value.templateId = defaultTpl.id
  } catch {
    orgTemplates.value = []
  }
})

async function create() {
  nameError.value = ''
  if (!form.value.name.trim()) {
    nameError.value = t('errors.required', { field: t('organizations.name') })
    return
  }
  submitting.value = true
  try {
    const { templateFields, ...rest } = form.value
    const res = await api.createOrganization({
      ...rest,
      fields: Object.keys(templateFields).length ? templateFields : undefined,
    })
    await router.push(`/campaigns/${campaignId}/organizations/${res.slug}`)
  } catch (e: unknown) {
    alert((e as { data?: { message?: string } })?.data?.message || 'Failed to create organization')
  } finally {
    submitting.value = false
  }
}
</script>
