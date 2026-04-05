<template>
  <div class="p-8 max-w-3xl">
    <div class="flex items-center gap-2 text-sm text-muted-foreground mb-1">
      <NuxtLink :to="`/campaigns/${campaignId}`" class="hover:text-primary">{{
        $t('common.campaign')
      }}</NuxtLink>
      <span>/</span>
      <span>{{ $t('templates.title') }}</span>
    </div>

    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold">{{ $t('templates.title') }}</h1>
      <NuxtLink v-if="canManage" :to="`/campaigns/${campaignId}/templates/new`">
        <Button>{{ $t('templates.new') }}</Button>
      </NuxtLink>
    </div>

    <LoadingSkeleton v-if="loading" :rows="3" />
    <div v-else-if="templateList.length" class="space-y-2">
      <div
        v-for="tpl in templateList"
        :key="tpl.id"
        class="flex items-center justify-between p-4 rounded-lg border border-border"
      >
        <div class="flex-1 min-w-0">
          <NuxtLink
            v-if="canManage"
            :to="`/campaigns/${campaignId}/templates/${tpl.id}/edit`"
            class="font-medium hover:text-primary"
            >{{ tpl.name }}</NuxtLink
          >
          <span v-else class="font-medium">{{ tpl.name }}</span>
          <div class="flex items-center gap-2 mt-1">
            <span class="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded">{{
              tpl.entityTypeSlug
            }}</span>
            <span
              v-if="tpl.isDefault"
              class="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded"
              >{{ $t('templates.default') }}</span
            >
            <span class="text-xs text-muted-foreground"
              >{{ tpl.fieldCount ?? 0 }} {{ $t('templates.fields') }}</span
            >
          </div>
        </div>
        <div v-if="canManage" class="flex gap-2 shrink-0">
          <NuxtLink :to="`/campaigns/${campaignId}/templates/${tpl.id}/edit`">
            <Button variant="outline" size="sm">{{ $t('common.edit') }}</Button>
          </NuxtLink>
          <Button variant="destructive" size="sm" @click="confirmDelete(tpl)">{{
            $t('common.delete')
          }}</Button>
        </div>
      </div>
    </div>
    <EmptyState
      v-else
      icon="📋"
      :title="$t('templates.empty')"
      :description="$t('templates.emptyDescription')"
    />

    <ErrorToast v-if="error" :message="error" @dismiss="dismissError" />
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const { t } = useI18n()
const campaignId = route.params.id as string
const api = useCampaignApi(campaignId)
const { loading, error, withLoading, dismissError } = useLoadingState()

const templateList = ref<any[]>([])
const canManage = ref(false)

async function load() {
  await withLoading(async () => {
    const [templates, campaign] = await Promise.all([api.getTemplates(), api.getCampaign()])
    templateList.value = templates
    canManage.value = ['dm', 'co_dm'].includes((campaign as any).role ?? '')
  })
}

async function confirmDelete(tpl: any) {
  if (!confirm(t('templates.confirmDelete', { name: tpl.name }))) return
  await api.deleteTemplate(tpl.id)
  await load()
}

onMounted(load)
</script>
