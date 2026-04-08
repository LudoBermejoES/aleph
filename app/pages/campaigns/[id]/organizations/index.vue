<template>
  <div class="p-8">
    <div class="flex items-center gap-2 text-sm text-muted-foreground mb-1">
      <NuxtLink :to="`/campaigns/${campaignId}`" class="hover:text-primary">
        {{ $t('common.campaign') }}</NuxtLink
      >
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
    <ErrorToast v-if="error" :message="error" @dismiss="error = null" />
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
            <span
              class="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-secondary text-secondary-foreground"
            >
              <component
                :is="
                  {
                    faction: ICONS.orgFaction,
                    guild: ICONS.orgGuild,
                    army: ICONS.orgArmy,
                    cult: ICONS.orgCult,
                    government: ICONS.orgGovernment,
                  }[org.type] ?? ICONS.orgOther
                "
                class="w-3 h-3"
              />{{ $t(`organizations.types.${org.type}`) }}</span
            >
            <span
              class="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-secondary text-secondary-foreground"
            >
              <component
                :is="
                  org.status === 'active'
                    ? ICONS.orgActive
                    : org.status === 'inactive'
                      ? ICONS.orgInactive
                      : org.status === 'secret'
                        ? ICONS.orgSecret
                        : ICONS.orgDissolved
                "
                class="w-3 h-3"
              />{{ $t(`organizations.statuses.${org.status}`) }}</span
            >
          </div>
          <span class="text-sm text-muted-foreground"
            >{{ org.memberCount }} {{ org.memberCount === 1 ? 'member' : 'members' }}</span
          >
        </div>
        <p v-if="org.description" class="text-sm text-muted-foreground mt-1 line-clamp-1">
          {{ org.description }}
        </p>
      </NuxtLink>
      <PaginationControls
        :page="pagination.page.value"
        :page-size="pagination.pageSize.value"
        :total="pagination.total.value"
        :total-pages="pagination.totalPages.value"
        @change="
          (p) => {
            pagination.setPage(p)
            load()
          }
        "
      />
    </div>
    <div v-else class="text-center py-12 text-muted-foreground">
      <p class="text-lg">{{ $t('organizations.empty') }}</p>
      <p class="text-sm mt-1">{{ $t('organizations.emptyDescription') }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ICONS } from '~/utils/icons'
const route = useRoute()
const campaignId = route.params.id as string
const api = useCampaignApi(campaignId)

const orgs = ref<
  {
    id: string
    name: string
    slug: string
    type: string
    status: string
    memberCount?: number
    description?: string | null
  }[]
>([])
const { loading, error, withLoading } = useLoadingState()
const pagination = usePagination()

async function load() {
  await withLoading(async () => {
    const res = await api.getOrganizations()
    if (Array.isArray(res)) {
      orgs.value = res
    } else {
      const paged = res as {
        data: typeof orgs.value
        meta: Parameters<typeof pagination.updateMeta>[0]
      }
      orgs.value = paged.data
      pagination.updateMeta(paged.meta)
    }
  })
}

onMounted(load)
</script>
