<template>
  <div class="p-8 max-w-2xl">
    <div class="flex items-center gap-2 text-sm text-muted-foreground mb-4">
      <NuxtLink :to="`/campaigns/${campaignId}`" class="hover:text-primary">Campaign</NuxtLink>
      <span>/</span>
      <NuxtLink :to="`/campaigns/${campaignId}/organizations`" class="hover:text-primary">{{ $t('organizations.title') }}</NuxtLink>
      <span>/</span>
      <NuxtLink :to="`/campaigns/${campaignId}/organizations/${slug}`" class="hover:text-primary">{{ form.name }}</NuxtLink>
      <span>/</span>
      <span>{{ $t('organizations.edit') }}</span>
    </div>
    <h1 class="text-2xl font-bold mb-6">{{ $t('organizations.edit') }}</h1>

    <LoadingSkeleton v-if="loading" :rows="3" />
    <form v-else class="space-y-4" @submit.prevent="save">
      <div>
        <label class="block text-sm font-medium mb-1">{{ $t('organizations.name') }}</label>
        <input
          v-model="form.name"
          type="text"
          class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          :placeholder="$t('organizations.namePlaceholder')"
          required
        />
      </div>

      <div>
        <label class="block text-sm font-medium mb-1">{{ $t('organizations.type') }}</label>
        <select v-model="form.type" class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
          <option v-for="t in types" :key="t" :value="t">{{ $t(`organizations.types.${t}`) }}</option>
        </select>
      </div>

      <div>
        <label class="block text-sm font-medium mb-1">{{ $t('organizations.status') }}</label>
        <select v-model="form.status" class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
          <option v-for="s in statuses" :key="s" :value="s">{{ $t(`organizations.statuses.${s}`) }}</option>
        </select>
      </div>

      <div>
        <label class="block text-sm font-medium mb-1">{{ $t('organizations.description') }}</label>
        <textarea
          v-model="form.description"
          rows="4"
          class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          :placeholder="$t('organizations.descriptionPlaceholder')"
        />
      </div>

      <div class="flex gap-2">
        <Button type="submit" :disabled="submitting">{{ $t('common.save') }}</Button>
        <NuxtLink :to="`/campaigns/${campaignId}/organizations/${slug}`">
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
const slug = route.params.slug as string
const { t } = useI18n()
const api = useCampaignApi(campaignId)

const types = ['faction', 'guild', 'army', 'cult', 'government', 'other']
const statuses = ['active', 'inactive', 'secret', 'dissolved']

const loading = ref(true)
const submitting = ref(false)
const form = ref({ name: '', type: 'faction', status: 'active', description: '' })

async function load() {
  const org = await api.getOrganization(slug).catch(() => null)
  if (!org) {
    await router.push(`/campaigns/${campaignId}/organizations`)
    return
  }
  form.value = { name: org.name, type: org.type, status: org.status, description: org.description || '' }
  loading.value = false
}

async function save() {
  submitting.value = true
  try {
    const res = await api.updateOrganization(slug, form.value)
    await router.push(`/campaigns/${campaignId}/organizations/${res.slug}`)
  } catch (e: any) {
    alert(e.data?.message || 'Failed to save organization')
  } finally {
    submitting.value = false
  }
}

onMounted(load)
</script>
