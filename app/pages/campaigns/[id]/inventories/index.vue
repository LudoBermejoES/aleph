<template>
  <div class="p-8">
    <div class="flex items-center gap-2 text-sm text-muted-foreground mb-1">
      <NuxtLink :to="`/campaigns/${campaignId}`" class="hover:text-primary">Campaign</NuxtLink>
      <span>/</span>
      <span>{{ $t('inventories.title') }}</span>
    </div>

    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold">{{ $t('inventories.title') }}</h1>
      <button @click="showForm = !showForm" class="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm" data-testid="new-inventory-btn">
        {{ showForm ? $t('common.cancel') : $t('inventories.new') }}
      </button>
    </div>

    <!-- Create form (party/faction inventories; characters get one automatically) -->
    <div v-if="showForm" class="mb-6 p-4 rounded-lg border border-border space-y-3" data-testid="inventory-form">
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="text-sm font-medium block mb-1">{{ $t('inventories.name') }}</label>
          <input v-model="form.name" :placeholder="$t('inventories.namePlaceholder')" class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" data-testid="inv-name" />
        </div>
        <div>
          <label class="text-sm font-medium block mb-1">{{ $t('inventories.type') }}</label>
          <select v-model="form.ownerType" class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" data-testid="inv-owner-type">
            <option value="party">{{ $t('inventories.typeParty') }}</option>
            <option value="faction">{{ $t('inventories.typeFaction') }}</option>
            <option value="character">{{ $t('inventories.typeCharacter') }}</option>
            <option value="shop">{{ $t('inventories.typeShop') }}</option>
          </select>
        </div>
        <div class="col-span-2">
          <label class="text-sm font-medium block mb-1">{{ $t('inventories.ownerId') }}</label>
          <input v-model="form.ownerId" :placeholder="$t('inventories.ownerIdPlaceholder')" class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" data-testid="inv-owner-id" />
        </div>
      </div>
      <p v-if="formError" class="text-sm text-destructive">{{ formError }}</p>
      <button @click="create" :disabled="!form.name.trim() || !form.ownerId.trim() || saving" class="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm disabled:opacity-50" data-testid="inv-save">
        {{ saving ? $t('common.saving') : $t('common.save') }}
      </button>
    </div>

    <!-- Filter by owner type -->
    <div class="flex gap-3 mb-4">
      <select v-model="ownerTypeFilter" @change="load" class="rounded-md border border-input bg-background px-3 py-2 text-sm" data-testid="inv-type-filter">
        <option value="">{{ $t('inventories.allTypes') }}</option>
        <option value="character">{{ $t('inventories.typeCharacter') }}</option>
        <option value="party">{{ $t('inventories.typeParty') }}</option>
        <option value="faction">{{ $t('inventories.typeFaction') }}</option>
        <option value="shop">{{ $t('inventories.typeShop') }}</option>
      </select>
    </div>

    <LoadingSkeleton v-if="loading" :rows="4" />
    <div v-else-if="inventoryList.length" class="space-y-2">
      <NuxtLink
        v-for="inv in inventoryList"
        :key="inv.id"
        :to="`/campaigns/${campaignId}/inventories/${inv.id}`"
        class="block p-3 rounded border border-border hover:border-primary/50 transition-colors"
        :data-testid="`inv-row-${inv.id}`"
      >
        <div class="flex items-center justify-between">
          <div>
            <span class="font-medium">{{ inv.name }}</span>
            <span class="text-xs ml-2 px-2 py-0.5 rounded bg-secondary text-secondary-foreground">{{ inv.ownerType }}</span>
          </div>
          <span class="text-sm text-muted-foreground">{{ inv.items?.length ?? 0 }} {{ $t('inventories.items') }}</span>
        </div>
      </NuxtLink>
    </div>
    <EmptyState v-else icon="🎒" :title="$t('inventories.empty')" :description="$t('inventories.emptyDescription')" />

    <ErrorToast v-if="error" :message="error" @dismiss="error = ''" />
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const campaignId = route.params.id as string
const api = useCampaignApi(campaignId)
const { t } = useI18n()
const inventoryList = ref<any[]>([])
const loading = ref(true)
const error = ref('')
const ownerTypeFilter = ref('')
const showForm = ref(false)
const saving = ref(false)
const formError = ref('')
const form = ref({ name: '', ownerType: 'party', ownerId: '' })

async function load() {
  loading.value = true
  try {
    const params: Record<string, string> = {}
    if (ownerTypeFilter.value) params.owner_type = ownerTypeFilter.value
    inventoryList.value = await api.getInventories(params)
  } catch {
    error.value = t('errors.failedLoad')
  } finally {
    loading.value = false
  }
}

async function create() {
  if (!form.value.name.trim() || !form.value.ownerId.trim()) return
  saving.value = true
  formError.value = ''
  try {
    await api.createInventory(form.value)
    form.value = { name: '', ownerType: 'party', ownerId: '' }
    showForm.value = false
    await load()
  } catch (e: any) {
    formError.value = e.data?.message || t('inventories.failedSave')
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>
