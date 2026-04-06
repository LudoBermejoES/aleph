<template>
  <div class="p-8">
    <div class="flex items-center justify-between mb-8">
      <div>
        <h1 class="text-3xl font-bold">{{ $t('campaigns.title') }}</h1>
        <p class="text-muted-foreground">{{ $t('campaigns.subtitle') }}</p>
      </div>
      <div class="flex gap-2">
        <Button variant="outline" :disabled="importing" @click="triggerImport">
          {{ importing ? $t('campaigns.importing') : $t('campaigns.import') }}
        </Button>
        <input
          ref="importFileInput"
          type="file"
          accept=".json"
          class="hidden"
          @change="handleImportFile"
        />
        <Dialog v-model:open="showCreateDialog">
          <DialogTrigger as-child>
            <Button>{{ $t('campaigns.new') }}</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{{ $t('campaigns.createTitle') }}</DialogTitle>
              <DialogDescription>{{ $t('campaigns.createDescription') }}</DialogDescription>
            </DialogHeader>
            <form class="space-y-4" @submit.prevent="createCampaign">
              <div class="space-y-2">
                <label for="name" class="text-sm font-medium">{{ $t('campaigns.name') }}</label>
                <Input
                  id="name"
                  v-model="newCampaign.name"
                  placeholder="Curse of Strahd"
                  required
                />
              </div>
              <div class="space-y-2">
                <label for="description" class="text-sm font-medium">{{
                  $t('campaigns.description')
                }}</label>
                <Input
                  id="description"
                  v-model="newCampaign.description"
                  placeholder="Gothic horror in Barovia..."
                />
              </div>
              <ThemePicker v-model="newCampaign.theme" />
              <div class="flex justify-end gap-2">
                <Button type="button" variant="outline" @click="showCreateDialog = false">{{
                  $t('common.cancel')
                }}</Button>
                <Button type="submit" :disabled="creating">{{
                  creating ? $t('campaigns.creating') : $t('common.create')
                }}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>

    <div v-if="campaigns.length" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <NuxtLink v-for="campaign in campaigns" :key="campaign.id" :to="`/campaigns/${campaign.id}`">
        <Card class="hover:border-primary/50 transition-colors cursor-pointer h-full">
          <CardHeader>
            <div class="flex items-center justify-between">
              <CardTitle class="text-lg">{{ campaign.name }}</CardTitle>
              <span class="text-xs px-2 py-1 rounded bg-secondary text-secondary-foreground">{{
                campaign.role
              }}</span>
            </div>
            <CardDescription v-if="campaign.description">{{
              campaign.description
            }}</CardDescription>
          </CardHeader>
        </Card>
      </NuxtLink>
    </div>

    <div v-else-if="!loading" class="text-center py-16">
      <p class="text-muted-foreground mb-4">{{ $t('campaigns.empty') }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n()
const campaigns = ref<Record<string, unknown>[]>([])
const loading = ref(true)
const showCreateDialog = ref(false)
const creating = ref(false)
const importing = ref(false)
const importFileInput = ref<HTMLInputElement | null>(null)
const newCampaign = reactive({ name: '', description: '', theme: 'default' })

function triggerImport() {
  importFileInput.value?.click()
}

async function handleImportFile(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  importing.value = true
  try {
    const text = await file.text()
    const payload = JSON.parse(text)
    const result = await $fetch<{ id: string; name: string; slug: string }>(
      '/api/campaigns/import',
      { method: 'POST', body: payload },
    )
    await loadCampaigns()
    navigateTo(`/campaigns/${result.id}`)
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    alert(err.data?.message || err.message || t('campaigns.importFailed'))
  } finally {
    importing.value = false
    if (importFileInput.value) importFileInput.value.value = ''
  }
}

async function loadCampaigns() {
  loading.value = true
  try {
    campaigns.value = await listCampaigns()
  } catch {
    campaigns.value = []
  } finally {
    loading.value = false
  }
}

async function createCampaign() {
  console.log('[Aleph] createCampaign called, name:', newCampaign.name)
  creating.value = true
  try {
    const result = await createCampaignEntry({
      name: newCampaign.name,
      description: newCampaign.description,
      theme: newCampaign.theme,
    })
    console.log('[Aleph] Campaign created:', result.id, result.slug)
    showCreateDialog.value = false
    newCampaign.name = ''
    newCampaign.description = ''
    newCampaign.theme = 'default'
    navigateTo(`/campaigns/${result.id}`)
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    console.error('[Aleph] Campaign creation failed:', err.data?.message || err.message || e)
    alert(err.data?.message || t('campaigns.failedCreate'))
  } finally {
    creating.value = false
  }
}

onMounted(loadCampaigns)
</script>
