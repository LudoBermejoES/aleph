<template>
  <div class="p-8">
    <LoadingSkeleton v-if="!campaign" :rows="4" />
    <div v-else class="space-y-8">
      <div class="flex items-center justify-between flex-wrap gap-y-2">
        <div>
          <h1 class="text-3xl font-bold">{{ campaign.name }}</h1>
          <p v-if="campaign.description" class="text-muted-foreground">
            {{ campaign.description }}
          </p>
        </div>
        <NuxtLink to="/">
          <Button variant="outline" size="sm">{{ $t('campaigns.backToCampaigns') }}</Button>
        </NuxtLink>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <NuxtLink :to="`/campaigns/${campaignId}/entities`">
          <Card class="hover:border-primary/50 transition-colors cursor-pointer">
            <CardHeader>
              <component :is="ICONS.wiki" class="w-6 h-6 mb-1 text-primary" />
              <CardTitle class="text-lg">{{ $t('campaigns.wiki') }}</CardTitle>
              <CardDescription>{{ $t('campaigns.wikiSubtitle') }}</CardDescription>
            </CardHeader>
          </Card>
        </NuxtLink>

        <NuxtLink :to="`/campaigns/${campaignId}/characters`">
          <Card class="hover:border-primary/50 transition-colors cursor-pointer">
            <CardHeader>
              <component :is="ICONS.characters" class="w-6 h-6 mb-1 text-primary" />
              <CardTitle class="text-lg">{{ $t('campaigns.characters') }}</CardTitle>
              <CardDescription>{{ $t('campaigns.charactersSubtitle') }}</CardDescription>
            </CardHeader>
          </Card>
        </NuxtLink>

        <NuxtLink :to="`/campaigns/${campaignId}/maps`">
          <Card class="hover:border-primary/50 transition-colors cursor-pointer">
            <CardHeader>
              <component :is="ICONS.maps" class="w-6 h-6 mb-1 text-primary" />
              <CardTitle class="text-lg">{{ $t('campaigns.maps') }}</CardTitle>
              <CardDescription>{{ $t('campaigns.mapsSubtitle') }}</CardDescription>
            </CardHeader>
          </Card>
        </NuxtLink>

        <NuxtLink :to="`/campaigns/${campaignId}/sessions`">
          <Card class="hover:border-primary/50 transition-colors cursor-pointer">
            <CardHeader>
              <component :is="ICONS.sessions" class="w-6 h-6 mb-1 text-primary" />
              <CardTitle class="text-lg">{{ $t('campaigns.sessions') }}</CardTitle>
              <CardDescription>{{ $t('campaigns.sessionsSubtitle') }}</CardDescription>
            </CardHeader>
          </Card>
        </NuxtLink>

        <NuxtLink :to="`/campaigns/${campaignId}/calendars`">
          <Card class="hover:border-primary/50 transition-colors cursor-pointer">
            <CardHeader>
              <component :is="ICONS.calendars" class="w-6 h-6 mb-1 text-primary" />
              <CardTitle class="text-lg">{{ $t('campaigns.calendarsTimelines') }}</CardTitle>
              <CardDescription>{{ $t('campaigns.calendarsTimelinesSubtitle') }}</CardDescription>
            </CardHeader>
          </Card>
        </NuxtLink>

        <NuxtLink :to="`/campaigns/${campaignId}/quests`">
          <Card class="hover:border-primary/50 transition-colors cursor-pointer">
            <CardHeader>
              <component :is="ICONS.quests" class="w-6 h-6 mb-1 text-primary" />
              <CardTitle class="text-lg">{{ $t('campaigns.quests') }}</CardTitle>
              <CardDescription>{{ $t('campaigns.questsSubtitle') }}</CardDescription>
            </CardHeader>
          </Card>
        </NuxtLink>

        <NuxtLink :to="`/campaigns/${campaignId}/items`">
          <Card class="hover:border-primary/50 transition-colors cursor-pointer">
            <CardHeader>
              <component :is="ICONS.items" class="w-6 h-6 mb-1 text-primary" />
              <CardTitle class="text-lg">{{ $t('campaigns.items') }}</CardTitle>
              <CardDescription>{{ $t('campaigns.itemsSubtitle') }}</CardDescription>
            </CardHeader>
          </Card>
        </NuxtLink>

        <NuxtLink :to="`/campaigns/${campaignId}/shops`">
          <Card class="hover:border-primary/50 transition-colors cursor-pointer">
            <CardHeader>
              <component :is="ICONS.shops" class="w-6 h-6 mb-1 text-primary" />
              <CardTitle class="text-lg">{{ $t('campaigns.shops') }}</CardTitle>
              <CardDescription>{{ $t('campaigns.shopsSubtitle') }}</CardDescription>
            </CardHeader>
          </Card>
        </NuxtLink>

        <NuxtLink :to="`/campaigns/${campaignId}/inventories`">
          <Card class="hover:border-primary/50 transition-colors cursor-pointer">
            <CardHeader>
              <component :is="ICONS.inventories" class="w-6 h-6 mb-1 text-primary" />
              <CardTitle class="text-lg">{{ $t('campaigns.inventories') }}</CardTitle>
              <CardDescription>{{ $t('campaigns.inventoriesSubtitle') }}</CardDescription>
            </CardHeader>
          </Card>
        </NuxtLink>

        <NuxtLink :to="`/campaigns/${campaignId}/currencies`">
          <Card class="hover:border-primary/50 transition-colors cursor-pointer">
            <CardHeader>
              <component :is="ICONS.currencies" class="w-6 h-6 mb-1 text-primary" />
              <CardTitle class="text-lg">{{ $t('campaigns.currencies') }}</CardTitle>
              <CardDescription>{{ $t('campaigns.currenciesSubtitle') }}</CardDescription>
            </CardHeader>
          </Card>
        </NuxtLink>

        <NuxtLink :to="`/campaigns/${campaignId}/transactions`">
          <Card class="hover:border-primary/50 transition-colors cursor-pointer">
            <CardHeader>
              <component :is="ICONS.transactions" class="w-6 h-6 mb-1 text-primary" />
              <CardTitle class="text-lg">{{ $t('campaigns.transactions') }}</CardTitle>
              <CardDescription>{{ $t('campaigns.transactionsSubtitle') }}</CardDescription>
            </CardHeader>
          </Card>
        </NuxtLink>

        <NuxtLink :to="`/campaigns/${campaignId}/graph`">
          <Card class="hover:border-primary/50 transition-colors cursor-pointer">
            <CardHeader>
              <component :is="ICONS.graph" class="w-6 h-6 mb-1 text-primary" />
              <CardTitle class="text-lg">{{ $t('campaigns.graph') }}</CardTitle>
              <CardDescription>{{ $t('campaigns.graphSubtitle') }}</CardDescription>
            </CardHeader>
          </Card>
        </NuxtLink>

        <NuxtLink :to="`/campaigns/${campaignId}/members`">
          <Card class="hover:border-primary/50 transition-colors cursor-pointer">
            <CardHeader>
              <component :is="ICONS.members" class="w-6 h-6 mb-1 text-primary" />
              <CardTitle class="text-lg">{{ $t('campaigns.members') }}</CardTitle>
              <CardDescription>{{ $t('campaigns.membersSubtitle') }}</CardDescription>
            </CardHeader>
          </Card>
        </NuxtLink>
      </div>
    </div>

    <!-- Export Campaign (DM/Co-DM only) -->
    <div v-if="campaign && isDm" class="mt-8 border-t border-border pt-8">
      <h2 class="text-lg font-semibold mb-4">{{ $t('campaign.export') }}</h2>
      <div class="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          :disabled="exporting"
          data-testid="export-campaign-btn"
          @click="exportCampaign"
        >
          {{ exporting ? $t('common.loading') : $t('campaign.exportButton') }}
        </Button>
        <span v-if="exportError" class="text-sm text-destructive">{{ exportError }}</span>
      </div>
    </div>

    <!-- Campaign Settings (DM/Co-DM only) -->
    <div v-if="campaign && isDm" class="mt-8 border-t border-border pt-8">
      <h2 class="text-lg font-semibold mb-4">{{ $t('campaigns.settings') }}</h2>
      <div class="max-w-sm space-y-4">
        <!-- Name & Description -->
        <div class="space-y-2">
          <label class="text-sm font-medium">{{ $t('campaign.editName') }}</label>
          <input
            v-model="editName"
            type="text"
            maxlength="200"
            class="w-full px-3 py-2 rounded border border-input bg-background text-sm"
            data-testid="campaign-name-input"
          />
        </div>
        <div class="space-y-2">
          <label class="text-sm font-medium">{{ $t('campaign.editDescription') }}</label>
          <textarea
            v-model="editDescription"
            rows="3"
            maxlength="5000"
            class="w-full px-3 py-2 rounded border border-input bg-background text-sm"
            data-testid="campaign-description-input"
          ></textarea>
        </div>
        <div class="flex items-center gap-2">
          <Button size="sm" :disabled="savingDetails" @click="saveDetails">
            {{ savingDetails ? $t('common.saving') : $t('campaign.saveDetails') }}
          </Button>
          <span v-if="detailsSaved" class="text-sm text-muted-foreground">{{
            $t('campaign.detailsSaved')
          }}</span>
          <span v-if="detailsError" class="text-sm text-destructive">{{ detailsError }}</span>
        </div>
        <!-- Theme -->
        <ThemePicker v-model="selectedTheme" />
        <div class="flex items-center gap-2">
          <Button size="sm" :disabled="savingTheme" @click="saveTheme">
            {{ savingTheme ? $t('common.saving') : $t('common.save') }}
          </Button>
          <span v-if="themeSaved" class="text-sm text-muted-foreground">{{
            $t('common.saved')
          }}</span>
        </div>
      </div>
    </div>

    <!-- Danger Zone (DM only) -->
    <div v-if="campaign && isDm" class="mt-8 border-t border-destructive/30 pt-8">
      <h2 class="text-lg font-semibold mb-4 text-destructive">{{ $t('common.dangerZone') }}</h2>
      <div class="flex items-center gap-3">
        <Button
          variant="destructive"
          size="sm"
          :disabled="deleting"
          data-testid="delete-campaign-btn"
          @click="showDeleteDialog = true"
        >
          {{ $t('campaign.deleteButton') }}
        </Button>
        <span v-if="deleteError" class="text-sm text-destructive">{{ deleteError }}</span>
      </div>
    </div>

    <!-- Delete Confirmation Dialog -->
    <Dialog v-model:open="showDeleteDialog">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{{ $t('campaign.delete') }}</DialogTitle>
          <DialogDescription>
            {{ $t('campaign.confirmDelete', { name: campaign?.name }) }}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" :disabled="deleting" @click="showDeleteDialog = false">
            {{ $t('common.cancel') }}
          </Button>
          <Button
            variant="destructive"
            :disabled="deleting"
            data-testid="confirm-delete-campaign-btn"
            @click="deleteCampaign"
          >
            {{ deleting ? $t('common.loading') : $t('campaign.delete') }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <DiceRoller :campaign-id="campaignId" />
  </div>
</template>

<script setup lang="ts">
import { ICONS } from '~/utils/icons'

const route = useRoute()
const campaignId = route.params.id as string
const { t } = useI18n()

const { data: campaign } = await useFetch<{
  id: string
  name: string
  description: string | null
  theme: string | null
  role: string | null
}>(`/api/campaigns/${campaignId}`)

const isDm = computed(() => ['dm', 'co_dm'].includes(campaign.value?.role ?? ''))
const editName = ref(campaign.value?.name ?? '')
const editDescription = ref(campaign.value?.description ?? '')
const savingDetails = ref(false)
const detailsSaved = ref(false)
const detailsError = ref<string | null>(null)
const selectedTheme = ref(campaign.value?.theme || 'default')
const savingTheme = ref(false)
const themeSaved = ref(false)
const exporting = ref(false)
const exportError = ref<string | null>(null)
const deleting = ref(false)
const deleteError = ref<string | null>(null)
const showDeleteDialog = ref(false)
// Shared state with layout so the theme applies without a page reload
const campaignTheme = useState<string | null>('campaignTheme')

async function exportCampaign() {
  exporting.value = true
  exportError.value = null
  try {
    const res = await fetch(`/api/campaigns/${campaignId}/export`, { credentials: 'include' })
    if (!res.ok) {
      exportError.value = t('campaign.exportError')
      return
    }
    const blob = await res.blob()
    const disposition = res.headers.get('content-disposition') || ''
    const filenameMatch = disposition.match(/filename="([^"]+)"/)
    const filename = filenameMatch?.[1] || `campaign-export.zip`
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  } catch {
    exportError.value = t('campaign.exportError')
  } finally {
    exporting.value = false
  }
}

async function deleteCampaign() {
  deleting.value = true
  deleteError.value = null
  try {
    await $fetch(`/api/campaigns/${campaignId}`, { method: 'DELETE' })
    await navigateTo('/')
  } catch {
    deleteError.value = t('campaign.deleteError')
    showDeleteDialog.value = false
  } finally {
    deleting.value = false
  }
}

async function saveDetails() {
  if (!editName.value.trim()) return
  savingDetails.value = true
  detailsSaved.value = false
  detailsError.value = null
  try {
    await updateCampaignEntry(campaignId, {
      name: editName.value.trim(),
      description: editDescription.value || null,
    })
    if (campaign.value) {
      campaign.value.name = editName.value.trim()
      campaign.value.description = editDescription.value || null
    }
    detailsSaved.value = true
    setTimeout(() => {
      detailsSaved.value = false
    }, 2000)
  } catch (e: unknown) {
    const err = e as { data?: { message?: string } }
    detailsError.value = err.data?.message || t('campaign.detailsError')
  } finally {
    savingDetails.value = false
  }
}

async function saveTheme() {
  savingTheme.value = true
  themeSaved.value = false
  try {
    await updateCampaignEntry(campaignId, { theme: selectedTheme.value })
    campaignTheme.value = selectedTheme.value
    themeSaved.value = true
    setTimeout(() => {
      themeSaved.value = false
    }, 2000)
  } catch (e: unknown) {
    const err = e as { data?: { message?: string } }
    alert(err.data?.message || t('errors.failedSave'))
  } finally {
    savingTheme.value = false
  }
}
</script>
