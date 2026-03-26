<template>
  <div class="p-8">
    <div v-if="campaign" class="space-y-8">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold">{{ campaign.name }}</h1>
          <p v-if="campaign.description" class="text-muted-foreground">{{ campaign.description }}</p>
        </div>
        <NuxtLink to="/">
          <Button variant="outline" size="sm">Back to Campaigns</Button>
        </NuxtLink>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <NuxtLink :to="`/campaigns/${campaignId}/entities`">
          <Card class="hover:border-primary/50 transition-colors cursor-pointer">
            <CardHeader>
              <CardTitle class="text-lg">Wiki</CardTitle>
              <CardDescription>Characters, locations, factions, items, and lore</CardDescription>
            </CardHeader>
          </Card>
        </NuxtLink>

        <NuxtLink :to="`/campaigns/${campaignId}/characters`">
          <Card class="hover:border-primary/50 transition-colors cursor-pointer">
            <CardHeader>
              <CardTitle class="text-lg">Characters</CardTitle>
              <CardDescription>PCs, NPCs, stats, and abilities</CardDescription>
            </CardHeader>
          </Card>
        </NuxtLink>

        <NuxtLink :to="`/campaigns/${campaignId}/maps`">
          <Card class="hover:border-primary/50 transition-colors cursor-pointer">
            <CardHeader>
              <CardTitle class="text-lg">Maps</CardTitle>
              <CardDescription>Interactive maps with pins, layers, and regions</CardDescription>
            </CardHeader>
          </Card>
        </NuxtLink>

        <NuxtLink :to="`/campaigns/${campaignId}/sessions`">
          <Card class="hover:border-primary/50 transition-colors cursor-pointer">
            <CardHeader>
              <CardTitle class="text-lg">Sessions</CardTitle>
              <CardDescription>Session logs, scheduling, and attendance</CardDescription>
            </CardHeader>
          </Card>
        </NuxtLink>

        <NuxtLink :to="`/campaigns/${campaignId}/calendars`">
          <Card class="hover:border-primary/50 transition-colors cursor-pointer">
            <CardHeader>
              <CardTitle class="text-lg">Calendars & Timelines</CardTitle>
              <CardDescription>Custom calendars, moons, seasons, and timelines</CardDescription>
            </CardHeader>
          </Card>
        </NuxtLink>

        <NuxtLink :to="`/campaigns/${campaignId}/quests`">
          <Card class="hover:border-primary/50 transition-colors cursor-pointer">
            <CardHeader>
              <CardTitle class="text-lg">Quests</CardTitle>
              <CardDescription>Quest tracking with sub-quests and status</CardDescription>
            </CardHeader>
          </Card>
        </NuxtLink>

        <NuxtLink :to="`/campaigns/${campaignId}/items`">
          <Card class="hover:border-primary/50 transition-colors cursor-pointer">
            <CardHeader>
              <CardTitle class="text-lg">Items</CardTitle>
              <CardDescription>Item library, inventories, and loot</CardDescription>
            </CardHeader>
          </Card>
        </NuxtLink>

        <NuxtLink :to="`/campaigns/${campaignId}/shops`">
          <Card class="hover:border-primary/50 transition-colors cursor-pointer">
            <CardHeader>
              <CardTitle class="text-lg">Shops</CardTitle>
              <CardDescription>In-game shops with stock and purchasing</CardDescription>
            </CardHeader>
          </Card>
        </NuxtLink>

        <NuxtLink :to="`/campaigns/${campaignId}/inventories`">
          <Card class="hover:border-primary/50 transition-colors cursor-pointer">
            <CardHeader>
              <CardTitle class="text-lg">Inventories</CardTitle>
              <CardDescription>Character, party, and faction inventories</CardDescription>
            </CardHeader>
          </Card>
        </NuxtLink>

        <NuxtLink :to="`/campaigns/${campaignId}/currencies`">
          <Card class="hover:border-primary/50 transition-colors cursor-pointer">
            <CardHeader>
              <CardTitle class="text-lg">Currencies</CardTitle>
              <CardDescription>Define currencies and conversion rates</CardDescription>
            </CardHeader>
          </Card>
        </NuxtLink>

        <NuxtLink :to="`/campaigns/${campaignId}/transactions`">
          <Card class="hover:border-primary/50 transition-colors cursor-pointer">
            <CardHeader>
              <CardTitle class="text-lg">Transactions</CardTitle>
              <CardDescription>Immutable ledger of all wealth and item transfers</CardDescription>
            </CardHeader>
          </Card>
        </NuxtLink>

        <NuxtLink :to="`/campaigns/${campaignId}/graph`">
          <Card class="hover:border-primary/50 transition-colors cursor-pointer">
            <CardHeader>
              <CardTitle class="text-lg">Relationship Graph</CardTitle>
              <CardDescription>Visualize connections between entities</CardDescription>
            </CardHeader>
          </Card>
        </NuxtLink>

        <NuxtLink :to="`/campaigns/${campaignId}/members`">
          <Card class="hover:border-primary/50 transition-colors cursor-pointer">
            <CardHeader>
              <CardTitle class="text-lg">Members</CardTitle>
              <CardDescription>Invite players, manage roles and permissions</CardDescription>
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
