<template>
  <div class="p-8">
    <div v-if="campaign" class="space-y-8">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold">{{ campaign.name }}</h1>
          <p v-if="campaign.description" class="text-muted-foreground">{{ campaign.description }}</p>
        </div>
        <NuxtLink to="/">
          <Button variant="outline" size="sm">{{ $t('campaigns.backToCampaigns') }}</Button>
        </NuxtLink>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <NuxtLink :to="`/campaigns/${campaignId}/entities`">
          <Card class="hover:border-primary/50 transition-colors cursor-pointer">
            <CardHeader>
              <CardTitle class="text-lg">{{ $t('campaigns.wiki') }}</CardTitle>
              <CardDescription>{{ $t('campaigns.wikiSubtitle') }}</CardDescription>
            </CardHeader>
          </Card>
        </NuxtLink>

        <NuxtLink :to="`/campaigns/${campaignId}/characters`">
          <Card class="hover:border-primary/50 transition-colors cursor-pointer">
            <CardHeader>
              <CardTitle class="text-lg">{{ $t('campaigns.characters') }}</CardTitle>
              <CardDescription>{{ $t('campaigns.charactersSubtitle') }}</CardDescription>
            </CardHeader>
          </Card>
        </NuxtLink>

        <NuxtLink :to="`/campaigns/${campaignId}/maps`">
          <Card class="hover:border-primary/50 transition-colors cursor-pointer">
            <CardHeader>
              <CardTitle class="text-lg">{{ $t('campaigns.maps') }}</CardTitle>
              <CardDescription>{{ $t('campaigns.mapsSubtitle') }}</CardDescription>
            </CardHeader>
          </Card>
        </NuxtLink>

        <NuxtLink :to="`/campaigns/${campaignId}/sessions`">
          <Card class="hover:border-primary/50 transition-colors cursor-pointer">
            <CardHeader>
              <CardTitle class="text-lg">{{ $t('campaigns.sessions') }}</CardTitle>
              <CardDescription>{{ $t('campaigns.sessionsSubtitle') }}</CardDescription>
            </CardHeader>
          </Card>
        </NuxtLink>

        <NuxtLink :to="`/campaigns/${campaignId}/calendars`">
          <Card class="hover:border-primary/50 transition-colors cursor-pointer">
            <CardHeader>
              <CardTitle class="text-lg">{{ $t('campaigns.calendarsTimelines') }}</CardTitle>
              <CardDescription>{{ $t('campaigns.calendarsTimelinesSubtitle') }}</CardDescription>
            </CardHeader>
          </Card>
        </NuxtLink>

        <NuxtLink :to="`/campaigns/${campaignId}/quests`">
          <Card class="hover:border-primary/50 transition-colors cursor-pointer">
            <CardHeader>
              <CardTitle class="text-lg">{{ $t('campaigns.quests') }}</CardTitle>
              <CardDescription>{{ $t('campaigns.questsSubtitle') }}</CardDescription>
            </CardHeader>
          </Card>
        </NuxtLink>

        <NuxtLink :to="`/campaigns/${campaignId}/items`">
          <Card class="hover:border-primary/50 transition-colors cursor-pointer">
            <CardHeader>
              <CardTitle class="text-lg">{{ $t('campaigns.items') }}</CardTitle>
              <CardDescription>{{ $t('campaigns.itemsSubtitle') }}</CardDescription>
            </CardHeader>
          </Card>
        </NuxtLink>

        <NuxtLink :to="`/campaigns/${campaignId}/shops`">
          <Card class="hover:border-primary/50 transition-colors cursor-pointer">
            <CardHeader>
              <CardTitle class="text-lg">{{ $t('campaigns.shops') }}</CardTitle>
              <CardDescription>{{ $t('campaigns.shopsSubtitle') }}</CardDescription>
            </CardHeader>
          </Card>
        </NuxtLink>

        <NuxtLink :to="`/campaigns/${campaignId}/inventories`">
          <Card class="hover:border-primary/50 transition-colors cursor-pointer">
            <CardHeader>
              <CardTitle class="text-lg">{{ $t('campaigns.inventories') }}</CardTitle>
              <CardDescription>{{ $t('campaigns.inventoriesSubtitle') }}</CardDescription>
            </CardHeader>
          </Card>
        </NuxtLink>

        <NuxtLink :to="`/campaigns/${campaignId}/currencies`">
          <Card class="hover:border-primary/50 transition-colors cursor-pointer">
            <CardHeader>
              <CardTitle class="text-lg">{{ $t('campaigns.currencies') }}</CardTitle>
              <CardDescription>{{ $t('campaigns.currenciesSubtitle') }}</CardDescription>
            </CardHeader>
          </Card>
        </NuxtLink>

        <NuxtLink :to="`/campaigns/${campaignId}/transactions`">
          <Card class="hover:border-primary/50 transition-colors cursor-pointer">
            <CardHeader>
              <CardTitle class="text-lg">{{ $t('campaigns.transactions') }}</CardTitle>
              <CardDescription>{{ $t('campaigns.transactionsSubtitle') }}</CardDescription>
            </CardHeader>
          </Card>
        </NuxtLink>

        <NuxtLink :to="`/campaigns/${campaignId}/graph`">
          <Card class="hover:border-primary/50 transition-colors cursor-pointer">
            <CardHeader>
              <CardTitle class="text-lg">{{ $t('campaigns.graph') }}</CardTitle>
              <CardDescription>{{ $t('campaigns.graphSubtitle') }}</CardDescription>
            </CardHeader>
          </Card>
        </NuxtLink>

        <NuxtLink :to="`/campaigns/${campaignId}/members`">
          <Card class="hover:border-primary/50 transition-colors cursor-pointer">
            <CardHeader>
              <CardTitle class="text-lg">{{ $t('campaigns.members') }}</CardTitle>
              <CardDescription>{{ $t('campaigns.membersSubtitle') }}</CardDescription>
            </CardHeader>
          </Card>
        </NuxtLink>
      </div>
    </div>

    <DiceRoller :campaign-id="campaignId" />
  </div>
</template>

<script setup lang="ts">

const route = useRoute()
const campaignId = route.params.id as string

const { data: campaign } = await useFetch(`/api/campaigns/${campaignId}`)
</script>
