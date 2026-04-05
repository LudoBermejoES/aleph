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
      <span>{{ $t('sessionGroups.title') }}</span>
    </div>

    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold">{{ $t('sessionGroups.title') }}</h1>
      <Button @click="openCreate">{{ $t('sessionGroups.new') }}</Button>
    </div>

    <LoadingSkeleton v-if="loading" :rows="3" />

    <div v-if="!loading && groups.length" class="space-y-3">
      <div
        v-for="group in groups"
        :key="group.id"
        class="flex items-center gap-4 p-4 rounded-lg border border-border"
      >
        <!-- Image upload area -->
        <div
          class="relative flex-shrink-0 cursor-pointer group/img"
          @click="triggerImageUpload(group)"
        >
          <img
            v-if="group.imageUrl"
            :src="group.imageUrl"
            :alt="group.name"
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
          @change="(e) => handleImageUpload(e, group)"
        />

        <!-- Group info -->
        <div class="flex-1 min-w-0">
          <div class="font-medium">{{ group.name }}</div>
          <div v-if="group.description" class="text-sm text-muted-foreground truncate">
            {{ group.description }}
          </div>
        </div>

        <!-- Actions -->
        <div class="flex items-center gap-2 flex-shrink-0">
          <Button variant="outline" size="sm" @click="openEdit(group)">{{
            $t('common.edit')
          }}</Button>
          <Button
            variant="outline"
            size="sm"
            @click="confirmDelete(group)"
            class="text-destructive hover:text-destructive"
            >{{ $t('common.delete') }}</Button
          >
        </div>
      </div>
    </div>

    <EmptyState
      v-if="!loading && !groups.length"
      icon="👥"
      :title="$t('sessionGroups.empty')"
      :description="$t('sessionGroups.emptyDescription')"
    />

    <!-- Create/Edit dialog -->
    <Dialog v-model:open="showForm">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{{
            editingGroup ? $t('sessionGroups.edit') : $t('sessionGroups.new')
          }}</DialogTitle>
        </DialogHeader>
        <div class="space-y-4 py-2">
          <div>
            <label class="text-sm font-medium">{{ $t('sessionGroups.name') }}</label>
            <input
              v-model="formData.name"
              type="text"
              :placeholder="$t('sessionGroups.namePlaceholder')"
              class="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label class="text-sm font-medium">{{ $t('sessionGroups.description') }}</label>
            <textarea
              v-model="formData.description"
              rows="3"
              :placeholder="$t('sessionGroups.descriptionPlaceholder')"
              class="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" @click="showForm = false">{{ $t('common.cancel') }}</Button>
          <Button @click="saveGroup" :disabled="!formData.name.trim() || saving">
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

const groups = ref<any[]>([])
const showForm = ref(false)
const saving = ref(false)
const editingGroup = ref<any>(null)
const formData = ref({ name: '', description: '' })
const imageInputRefs = ref<HTMLInputElement[]>([])

async function load() {
  await withLoading(async () => {
    groups.value = await api.getSessionGroups()
  })
}

function openCreate() {
  editingGroup.value = null
  formData.value = { name: '', description: '' }
  showForm.value = true
}

function openEdit(group: any) {
  editingGroup.value = group
  formData.value = { name: group.name, description: group.description || '' }
  showForm.value = true
}

async function saveGroup() {
  if (!formData.value.name.trim()) return
  saving.value = true
  try {
    if (editingGroup.value) {
      await api.updateSessionGroup(editingGroup.value.slug, formData.value)
    } else {
      await api.createSessionGroup(formData.value)
    }
    showForm.value = false
    await load()
  } catch (e: any) {
    error.value = e.data?.message || t('sessionGroups.failedSave')
  } finally {
    saving.value = false
  }
}

async function confirmDelete(group: any) {
  if (!confirm(t('sessionGroups.confirmDelete'))) return
  try {
    await api.deleteSessionGroup(group.slug)
    await load()
  } catch (e: any) {
    error.value = e.data?.message || t('sessionGroups.failedDelete')
  }
}

function triggerImageUpload(group: any) {
  const idx = groups.value.findIndex((g) => g.id === group.id)
  if (idx !== -1 && imageInputRefs.value[idx]) {
    imageInputRefs.value[idx].click()
  }
}

async function handleImageUpload(event: Event, group: any) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  const formPayload = new FormData()
  formPayload.append('file', file)
  try {
    await $fetch(`/api/campaigns/${campaignId}/session-groups/${group.slug}/image`, {
      method: 'POST',
      body: formPayload,
    })
    await load()
  } catch (e: any) {
    error.value = e.data?.message || t('sessionGroups.failedSave')
  }
  // reset input
  const idx = groups.value.findIndex((g) => g.id === group.id)
  if (idx !== -1 && imageInputRefs.value[idx]) imageInputRefs.value[idx].value = ''
}

onMounted(load)
</script>
