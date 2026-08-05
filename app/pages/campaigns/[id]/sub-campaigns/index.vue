<template>
  <div class="p-8">
    <div class="flex items-center gap-2 text-sm text-muted-foreground mb-1">
      <NuxtLink :to="`/campaigns/${campaignId}`" class="hover:text-primary">
        {{ $t('common.campaign') }}</NuxtLink
      >
      <span>/</span>
      <NuxtLink :to="`/campaigns/${campaignId}/sessions`" class="hover:text-primary">{{
        $t('sessions.title')
      }}</NuxtLink>
      <span>/</span>
      <span>{{ $t('subCampaigns.title') }}</span>
    </div>

    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold">{{ $t('subCampaigns.title') }}</h1>
      <Button @click="openCreate">{{ $t('subCampaigns.new') }}</Button>
    </div>

    <LoadingSkeleton v-if="loading" :rows="3" />

    <div v-if="!loading && subCampaigns.length" class="space-y-3">
      <div
        v-for="subCampaign in subCampaigns"
        :key="subCampaign.id"
        class="flex items-center gap-4 p-4 rounded-lg border border-border"
      >
        <!-- Image upload area -->
        <div
          class="relative flex-shrink-0 cursor-pointer group/img"
          @click="triggerImageUpload(subCampaign)"
        >
          <img
            v-if="subCampaign.imageUrl"
            :src="subCampaign.imageUrl"
            :alt="subCampaign.name"
            class="w-16 h-16 rounded-lg object-cover"
          />
          <div
            v-else
            class="w-16 h-16 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground"
          >
            <component :is="ICONS.image" class="w-6 h-6" />
          </div>
          <div
            class="absolute inset-0 rounded-lg bg-black/40 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity"
          >
            <component :is="ICONS.upload" class="w-4 h-4 text-white" />
          </div>
        </div>
        <input
          ref="imageInputRefs"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          class="hidden"
          @change="(e) => handleImageUpload(e, subCampaign)"
        />

        <!-- Sub-campaign info -->
        <div class="flex-1 min-w-0">
          <div class="font-medium flex items-center gap-2">
            {{ subCampaign.name }}
            <span
              v-if="subCampaign.isDefault"
              class="text-xs px-1.5 py-0.5 rounded bg-secondary text-muted-foreground"
              >{{ $t('subCampaigns.default') }}</span
            >
          </div>
          <div v-if="subCampaign.description" class="text-sm text-muted-foreground truncate">
            {{ subCampaign.description }}
          </div>
        </div>

        <!-- Actions -->
        <div class="flex items-center gap-2 flex-shrink-0">
          <Button variant="outline" size="sm" @click="openEdit(subCampaign)">{{
            $t('common.edit')
          }}</Button>
          <Button
            v-if="!subCampaign.isDefault"
            variant="outline"
            size="sm"
            class="text-destructive hover:text-destructive"
            @click="confirmDelete(subCampaign)"
            >{{ $t('common.delete') }}</Button
          >
        </div>
      </div>
    </div>

    <EmptyState
      v-if="!loading && !subCampaigns.length"
      icon="👥"
      :title="$t('subCampaigns.empty')"
      :description="$t('subCampaigns.emptyDescription')"
    />

    <!-- Create/Edit dialog -->
    <Dialog v-model:open="showForm">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{{
            editingSubCampaign ? $t('subCampaigns.edit') : $t('subCampaigns.new')
          }}</DialogTitle>
        </DialogHeader>
        <div class="space-y-4 py-2">
          <div>
            <label class="text-sm font-medium">{{ $t('subCampaigns.name') }}</label>
            <input
              v-model="formData.name"
              type="text"
              :placeholder="$t('subCampaigns.namePlaceholder')"
              class="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label class="text-sm font-medium">{{ $t('subCampaigns.description') }}</label>
            <textarea
              v-model="formData.description"
              rows="3"
              :placeholder="$t('subCampaigns.descriptionPlaceholder')"
              class="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            ></textarea>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" @click="showForm = false">{{ $t('common.cancel') }}</Button>
          <Button :disabled="!formData.name.trim() || saving" @click="saveSubCampaign">
            {{ saving ? $t('common.saving') : $t('common.save') }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <ErrorToast v-if="error" :message="error" @dismiss="dismissError" />
  </div>
</template>

<script setup lang="ts">
import { ICONS } from '~/utils/icons'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '~/components/ui/dialog'

const route = useRoute()
const campaignId = route.params.id as string
const { t } = useI18n()
const { loading, error, withLoading, dismissError } = useLoadingState()
const api = useCampaignApi(campaignId)

interface SubCampaign {
  id: string
  slug: string
  name: string
  description?: string | null
  imageUrl?: string | null
  isDefault?: boolean
}

const subCampaigns = ref<SubCampaign[]>([])
const showForm = ref(false)
const saving = ref(false)
const editingSubCampaign = ref<SubCampaign | null>(null)
const formData = ref({ name: '', description: '' })
const imageInputRefs = ref<HTMLInputElement[]>([])

async function load() {
  await withLoading(async () => {
    subCampaigns.value = await api.getSubCampaigns()
  })
}

function openCreate() {
  editingSubCampaign.value = null
  formData.value = { name: '', description: '' }
  showForm.value = true
}

function openEdit(subCampaign: SubCampaign) {
  editingSubCampaign.value = subCampaign
  formData.value = { name: subCampaign.name, description: subCampaign.description || '' }
  showForm.value = true
}

async function saveSubCampaign() {
  if (!formData.value.name.trim()) return
  saving.value = true
  try {
    if (editingSubCampaign.value) {
      await api.updateSubCampaign(editingSubCampaign.value.slug, formData.value)
    } else {
      await api.createSubCampaign(formData.value)
    }
    showForm.value = false
    await load()
  } catch (e: unknown) {
    error.value =
      (e as { data?: { message?: string } })?.data?.message || t('subCampaigns.failedSave')
  } finally {
    saving.value = false
  }
}

async function confirmDelete(subCampaign: SubCampaign) {
  if (!confirm(t('subCampaigns.confirmDelete'))) return
  try {
    await api.deleteSubCampaign(subCampaign.slug)
    await load()
  } catch (e: unknown) {
    error.value =
      (e as { data?: { message?: string } })?.data?.message || t('subCampaigns.failedDelete')
  }
}

function triggerImageUpload(subCampaign: SubCampaign) {
  const idx = subCampaigns.value.findIndex((g) => g.id === subCampaign.id)
  if (idx !== -1 && imageInputRefs.value[idx]) {
    imageInputRefs.value[idx].click()
  }
}

async function handleImageUpload(event: Event, subCampaign: SubCampaign) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  const formPayload = new FormData()
  formPayload.append('file', file)
  try {
    await $fetch(`/api/campaigns/${campaignId}/sub-campaigns/${subCampaign.slug}/image`, {
      method: 'POST',
      body: formPayload,
    })
    await load()
  } catch (e: unknown) {
    error.value =
      (e as { data?: { message?: string } })?.data?.message || t('subCampaigns.failedSave')
  }
  // reset input
  const idx = subCampaigns.value.findIndex((g) => g.id === subCampaign.id)
  if (idx !== -1 && imageInputRefs.value[idx]) imageInputRefs.value[idx].value = ''
}

onMounted(load)
</script>
