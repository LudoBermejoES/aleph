<template>
  <div class="p-8">
    <div class="flex items-center justify-between mb-8">
      <div>
        <h1 class="text-3xl font-bold">{{ $t('campaigns.title') }}</h1>
        <p class="text-muted-foreground">{{ $t('campaigns.subtitle') }}</p>
      </div>
      <Dialog v-model:open="showCreateDialog">
        <DialogTrigger as-child>
          <Button>{{ $t('campaigns.new') }}</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{{ $t('campaigns.createTitle') }}</DialogTitle>
            <DialogDescription>{{ $t('campaigns.createDescription') }}</DialogDescription>
          </DialogHeader>
          <form @submit.prevent="createCampaign" class="space-y-4">
            <div class="space-y-2">
              <label for="name" class="text-sm font-medium">{{ $t('campaigns.name') }}</label>
              <Input id="name" v-model="newCampaign.name" placeholder="Curse of Strahd" required />
            </div>
            <div class="space-y-2">
              <label for="description" class="text-sm font-medium">{{ $t('campaigns.description') }}</label>
              <Input id="description" v-model="newCampaign.description" placeholder="Gothic horror in Barovia..." />
            </div>
            <div class="flex justify-end gap-2">
              <Button type="button" variant="outline" @click="showCreateDialog = false">{{ $t('common.cancel') }}</Button>
              <Button type="submit" :disabled="creating">{{ creating ? $t('campaigns.creating') : $t('common.create') }}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>

    <div v-if="campaigns.length" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <NuxtLink v-for="campaign in campaigns" :key="campaign.id" :to="`/campaigns/${campaign.id}`">
        <Card class="hover:border-primary/50 transition-colors cursor-pointer h-full">
          <CardHeader>
            <div class="flex items-center justify-between">
              <CardTitle class="text-lg">{{ campaign.name }}</CardTitle>
              <span class="text-xs px-2 py-1 rounded bg-secondary text-secondary-foreground">{{ campaign.role }}</span>
            </div>
            <CardDescription v-if="campaign.description">{{ campaign.description }}</CardDescription>
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
const campaigns = ref<any[]>([])
const loading = ref(true)
const showCreateDialog = ref(false)
const creating = ref(false)
const newCampaign = reactive({ name: '', description: '' })

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
    const result = await createCampaignEntry({ name: newCampaign.name, description: newCampaign.description })
    console.log('[Aleph] Campaign created:', result.id, result.slug)
    showCreateDialog.value = false
    newCampaign.name = ''
    newCampaign.description = ''
    navigateTo(`/campaigns/${result.id}`)
  } catch (e: any) {
    console.error('[Aleph] Campaign creation failed:', e.data?.message || e.message || e)
    alert(e.data?.message || t('campaigns.failedCreate'))
  } finally {
    creating.value = false
  }
}

onMounted(loadCampaigns)
</script>
