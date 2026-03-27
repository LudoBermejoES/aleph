<template>
  <div class="p-8">
    <div class="flex items-center gap-2 text-sm text-muted-foreground mb-1">
      <NuxtLink :to="`/campaigns/${campaignId}`" class="hover:text-primary">Campaign</NuxtLink>
      <span>/</span>
      <span>{{ $t('organizations.title') }}</span>
    </div>

    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold">{{ $t('organizations.title') }}</h1>
      <NuxtLink :to="`/campaigns/${campaignId}/organizations/new`">
        <Button data-testid="new-organization-btn">{{ $t('organizations.new') }}</Button>
      </NuxtLink>
    </div>

    <LoadingSkeleton v-if="loading" :rows="4" />
    <div v-else-if="orgs.length" class="space-y-2">
      <NuxtLink
        v-for="org in orgs"
        :key="org.id"
        :to="`/campaigns/${campaignId}/organizations/${org.slug}`"
        class="block p-4 rounded-lg border border-border hover:border-primary/50 transition-colors"
        :data-testid="`org-row-${org.slug}`"
      >
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="font-medium">{{ org.name }}</span>
            <span class="text-xs px-2 py-0.5 rounded bg-secondary text-secondary-foreground">{{ $t(`organizations.types.${org.type}`) }}</span>
            <span class="text-xs px-2 py-0.5 rounded bg-secondary text-secondary-foreground">{{ $t(`organizations.statuses.${org.status}`) }}</span>
          </div>
          <span class="text-sm text-muted-foreground">{{ org.memberCount }} {{ org.memberCount === 1 ? 'member' : 'members' }}</span>
        </div>
        <p v-if="org.description" class="text-sm text-muted-foreground mt-1 line-clamp-1">{{ org.description }}</p>
      </NuxtLink>
    </div>
    <div v-else class="text-center py-12 text-muted-foreground">
      <p class="text-lg">{{ $t('organizations.empty') }}</p>
      <p class="text-sm mt-1">{{ $t('organizations.emptyDescription') }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const campaignId = route.params.id as string
const api = useCampaignApi(campaignId)

const orgs = ref<any[]>([])
const loading = ref(true)

async function load() {
  loading.value = true
  orgs.value = await api.getOrganizations().catch(() => [])
  loading.value = false
}

onMounted(load)
</script>
