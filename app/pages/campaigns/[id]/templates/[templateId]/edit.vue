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
      <span>{{ $t('common.edit') }}</span>
    </div>

    <div v-if="loading" class="text-muted-foreground">{{ $t('common.loading') }}</div>
    <template v-else>
      <h1 class="text-2xl font-bold mb-6">{{ template?.name }}</h1>

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
            saving ? $t('common.saving') : $t('common.save')
          }}</Button>
          <NuxtLink :to="`/campaigns/${campaignId}/templates`">
            <Button type="button" variant="outline">{{ $t('common.cancel') }}</Button>
          </NuxtLink>
        </div>
      </form>
    </template>

    <ErrorToast v-if="error" :message="error" @dismiss="error = null" />
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const router = useRouter()
const campaignId = route.params.id as string
const templateId = route.params.templateId as string
const api = useCampaignApi(campaignId)

const loading = ref(true)
const saving = ref(false)
const error = ref<string | null>(null)
const template = ref<Record<string, unknown> | null>(null)

interface TemplateField {
  _key: string
  key: string
  label: string
  fieldType: string
  required: boolean
  optionsRaw: string
}

const form = reactive({ name: '', isDefault: false })
const fields = ref<TemplateField[]>([])

onMounted(async () => {
  try {
    const tpl = await api.getTemplate(templateId)
    template.value = tpl
    form.name = tpl.name as string
    form.isDefault = tpl.isDefault as boolean
    fields.value = ((tpl.fields as Record<string, unknown>[]) ?? []).map((f) => ({
      _key: f.id as string,
      key: f.key as string,
      label: f.label as string,
      fieldType: f.fieldType as string,
      required: f.required as boolean,
      optionsRaw: Array.isArray(f.optionsJson)
        ? (f.optionsJson as string[]).join(', ')
        : typeof f.optionsJson === 'string'
          ? JSON.parse(f.optionsJson || '[]').join(', ')
          : '',
    }))
  } catch {
    await router.push(`/campaigns/${campaignId}/templates`)
  } finally {
    loading.value = false
  }
})

async function submit() {
  saving.value = true
  error.value = null
  try {
    const payload = {
      name: form.name,
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
    await api.updateTemplate(templateId, payload)
    await router.push(`/campaigns/${campaignId}/templates`)
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    error.value = err?.data?.message ?? err?.message ?? 'Error'
  } finally {
    saving.value = false
  }
}
</script>
