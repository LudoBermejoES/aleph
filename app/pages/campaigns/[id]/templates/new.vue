<template>
  <div class="p-8 max-w-2xl">
    <div class="flex items-center gap-2 text-sm text-muted-foreground mb-4">
      <NuxtLink :to="`/campaigns/${campaignId}`" class="hover:text-primary">{{
        $t('common.campaign')
      }}</NuxtLink>
      <span>/</span>
      <NuxtLink :to="`/campaigns/${campaignId}/templates`" class="hover:text-primary">{{
        $t('templates.title')
      }}</NuxtLink>
      <span>/</span>
      <span>{{ $t('templates.new') }}</span>
    </div>

    <h1 class="text-2xl font-bold mb-6">{{ $t('templates.new') }}</h1>

    <form class="space-y-6" @submit.prevent="submit">
      <div>
        <label class="text-sm font-medium">{{ $t('templates.name') }}</label>
        <input
          v-model="form.name"
          type="text"
          required
          class="w-full mt-1 px-3 py-2 rounded border border-input bg-background"
        />
      </div>

      <div>
        <label class="text-sm font-medium">{{ $t('templates.entityType') }}</label>
        <select
          v-model="form.entityTypeSlug"
          required
          class="w-full mt-1 px-3 py-2 rounded border border-input bg-background"
        >
          <option value="">{{ $t('templates.selectEntityType') }}</option>
          <option v-for="et in entityTypes" :key="et.slug" :value="et.slug">{{ et.name }}</option>
        </select>
      </div>

      <div class="flex items-center gap-2">
        <input id="isDefault" v-model="form.isDefault" type="checkbox" class="rounded" />
        <label for="isDefault" class="text-sm">{{ $t('templates.setAsDefault') }}</label>
      </div>

      <div>
        <label class="text-sm font-medium mb-2 block">{{ $t('templates.fields') }}</label>
        <TemplateFieldEditor v-model="fields" />
      </div>

      <div class="flex gap-2">
        <Button type="submit" :disabled="saving">{{
          saving ? $t('common.saving') : $t('common.create')
        }}</Button>
        <NuxtLink :to="`/campaigns/${campaignId}/templates`">
          <Button type="button" variant="outline">{{ $t('common.cancel') }}</Button>
        </NuxtLink>
      </div>
    </form>

    <ErrorToast v-if="error" :message="error" @dismiss="error = null" />
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const router = useRouter()
const campaignId = route.params.id as string
const api = useCampaignApi(campaignId)

const saving = ref(false)
const error = ref<string | null>(null)
const entityTypes = ref<Record<string, unknown>[]>([])

interface TemplateField {
  key: string
  label: string
  fieldType: string
  required: boolean
  optionsRaw: string
}

const form = reactive({ name: '', entityTypeSlug: '', isDefault: false })
const fields = ref<TemplateField[]>([])

onMounted(async () => {
  entityTypes.value = await api.getEntityTypes()
})

async function submit() {
  saving.value = true
  error.value = null
  try {
    const payload = {
      name: form.name,
      entityTypeSlug: form.entityTypeSlug,
      isDefault: form.isDefault,
      fields: fields.value.map((f, i) => ({
        key: f.key,
        label: f.label,
        fieldType: f.fieldType,
        required: f.required,
        sortOrder: i,
        options: f.optionsRaw
          ? f.optionsRaw
              .split(',')
              .map((o: string) => o.trim())
              .filter(Boolean)
          : null,
      })),
    }
    await api.createTemplate(payload)
    await router.push(`/campaigns/${campaignId}/templates`)
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    error.value = err?.data?.message ?? err?.message ?? 'Error'
  } finally {
    saving.value = false
  }
}
</script>
