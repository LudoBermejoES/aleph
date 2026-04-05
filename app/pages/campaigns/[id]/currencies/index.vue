<template>
  <div class="p-8">
    <div class="flex items-center gap-2 text-sm text-muted-foreground mb-1">
      <NuxtLink :to="`/campaigns/${campaignId}`" class="hover:text-primary">
        {{ $t('common.campaign') }}</NuxtLink
      >
      <span>/</span>
      <span>{{ $t('currencies.title') }}</span>
    </div>

    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold">{{ $t('currencies.title') }}</h1>
      <button
        v-if="canEdit"
        @click="showForm = !showForm"
        class="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm"
        data-testid="new-currency-btn"
      >
        {{ showForm ? $t('common.cancel') : $t('currencies.new') }}
      </button>
    </div>

    <!-- Create form -->
    <div
      v-if="showForm"
      class="mb-6 p-4 rounded-lg border border-border space-y-3"
      data-testid="currency-form"
    >
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="text-sm font-medium block mb-1">{{ $t('currencies.name') }}</label>
          <input
            v-model="form.name"
            :placeholder="$t('currencies.namePlaceholder')"
            class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            data-testid="currency-name"
          />
        </div>
        <div>
          <label class="text-sm font-medium block mb-1">{{ $t('currencies.symbol') }}</label>
          <input
            v-model="form.symbol"
            :placeholder="$t('currencies.symbolPlaceholder')"
            class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            data-testid="currency-symbol"
          />
        </div>
        <div>
          <label class="text-sm font-medium block mb-1">{{
            $t('currencies.valueInBaseUnits')
          }}</label>
          <input
            v-model.number="form.valueInBase"
            type="number"
            min="1"
            placeholder="100"
            class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            data-testid="currency-value"
          />
        </div>
        <div>
          <label class="text-sm font-medium block mb-1">{{ $t('currencies.sortOrder') }}</label>
          <input
            v-model.number="form.sortOrder"
            type="number"
            min="0"
            placeholder="0"
            class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            data-testid="currency-sort"
          />
        </div>
      </div>
      <p v-if="formError" class="text-sm text-destructive">{{ formError }}</p>
      <button
        @click="create"
        :disabled="!form.name.trim() || saving"
        class="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm disabled:opacity-50"
        data-testid="currency-save"
      >
        {{ saving ? $t('common.saving') : $t('common.save') }}
      </button>
    </div>

    <LoadingSkeleton v-if="loading" :rows="3" />
    <div v-else-if="currencyList.length" class="space-y-2">
      <div
        v-for="c in currencyList"
        :key="c.id"
        class="p-3 rounded border border-border"
        :data-testid="`currency-row-${c.id}`"
      >
        <!-- View mode -->
        <div v-if="editingId !== c.id" class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <span class="font-medium">{{ c.name }}</span>
            <span
              v-if="c.symbol"
              class="text-xs px-2 py-0.5 rounded bg-secondary text-secondary-foreground"
              >{{ c.symbol }}</span
            >
          </div>
          <div class="flex items-center gap-3">
            <span class="text-sm text-muted-foreground">{{
              $t('currencies.baseConversion', { value: c.valueInBase })
            }}</span>
            <div v-if="canEdit" class="flex gap-2">
              <button
                @click="startEdit(c)"
                class="text-sm text-muted-foreground hover:text-primary"
                :data-testid="`currency-edit-${c.id}`"
              >
                {{ $t('common.edit') }}
              </button>
              <button
                @click="confirmDelete(c)"
                class="text-sm text-muted-foreground hover:text-destructive"
                :data-testid="`currency-delete-${c.id}`"
              >
                {{ $t('common.delete') }}
              </button>
            </div>
          </div>
        </div>

        <!-- Inline edit form -->
        <div v-else class="space-y-3" :data-testid="`currency-edit-form-${c.id}`">
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="text-sm font-medium block mb-1">{{ $t('currencies.name') }}</label>
              <input
                v-model="editForm.name"
                class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                :data-testid="`currency-edit-name-${c.id}`"
              />
            </div>
            <div>
              <label class="text-sm font-medium block mb-1">{{ $t('currencies.symbol') }}</label>
              <input
                v-model="editForm.symbol"
                class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                :data-testid="`currency-edit-symbol-${c.id}`"
              />
            </div>
            <div>
              <label class="text-sm font-medium block mb-1">{{
                $t('currencies.valueInBaseUnits')
              }}</label>
              <input
                v-model.number="editForm.valueInBase"
                type="number"
                min="1"
                class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                :data-testid="`currency-edit-value-${c.id}`"
              />
            </div>
            <div>
              <label class="text-sm font-medium block mb-1">{{ $t('currencies.sortOrder') }}</label>
              <input
                v-model.number="editForm.sortOrder"
                type="number"
                min="0"
                class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                :data-testid="`currency-edit-sort-${c.id}`"
              />
            </div>
          </div>
          <p v-if="editError" class="text-sm text-destructive">{{ editError }}</p>
          <div class="flex gap-2">
            <button
              @click="saveEdit(c.id)"
              :disabled="!editForm.name.trim() || saving"
              class="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm disabled:opacity-50"
              :data-testid="`currency-edit-save-${c.id}`"
            >
              {{ saving ? $t('common.saving') : $t('common.save') }}
            </button>
            <button
              @click="cancelEdit"
              class="px-3 py-1.5 rounded-md border border-border text-sm"
              :data-testid="`currency-edit-cancel-${c.id}`"
            >
              {{ $t('common.cancel') }}
            </button>
          </div>
        </div>
      </div>
    </div>
    <EmptyState
      v-else
      icon="💰"
      :title="$t('currencies.empty')"
      :description="$t('currencies.emptyDescription')"
    />

    <ErrorToast v-if="error" :message="error" @dismiss="error = ''" />

    <!-- Delete confirmation dialog -->
    <Dialog v-model:open="showDeleteDialog">
      <DialogContent class="max-w-sm">
        <DialogHeader>
          <DialogTitle>{{ $t('currencies.deleteTitle') }}</DialogTitle>
        </DialogHeader>
        <p class="text-sm text-muted-foreground py-2">
          {{ $t('currencies.deleteConfirm', { name: deletingCurrency?.name }) }}
        </p>
        <DialogFooter>
          <button
            @click="showDeleteDialog = false"
            class="px-3 py-1.5 rounded-md border border-border text-sm"
            data-testid="currency-delete-cancel"
          >
            {{ $t('common.cancel') }}
          </button>
          <button
            @click="deleteCurrency"
            :disabled="saving"
            class="px-3 py-1.5 rounded-md bg-destructive text-destructive-foreground text-sm disabled:opacity-50"
            data-testid="currency-delete-confirm"
          >
            {{ saving ? $t('common.deleting') : $t('common.delete') }}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '~/components/ui/dialog'

const route = useRoute()
const campaignId = route.params.id as string
const api = useCampaignApi(campaignId)
const { t } = useI18n()
const currencyList = ref<any[]>([])
const loading = ref(true)
const error = ref('')
const showForm = ref(false)
const saving = ref(false)
const formError = ref('')
const form = ref({ name: '', symbol: '', valueInBase: 1, sortOrder: 0 })

const editingId = ref<string | null>(null)
const editForm = ref({ name: '', symbol: '', valueInBase: 1, sortOrder: 0 })
const editError = ref('')

const showDeleteDialog = ref(false)
const deletingCurrency = ref<any>(null)

const campaign = ref<any>(null)
const canEdit = computed(() => {
  const role = campaign.value?.role
  return role === 'dm' || role === 'co_dm' || role === 'editor'
})

async function load() {
  loading.value = true
  try {
    const [currencies, camp] = await Promise.all([api.getCurrencies(), api.getCampaign()])
    currencyList.value = currencies
    campaign.value = camp
  } catch {
    error.value = t('errors.failedLoad')
  } finally {
    loading.value = false
  }
}

async function create() {
  if (!form.value.name.trim()) return
  saving.value = true
  formError.value = ''
  try {
    await api.createCurrency(form.value)
    form.value = { name: '', symbol: '', valueInBase: 1, sortOrder: 0 }
    showForm.value = false
    await load()
  } catch (e: any) {
    formError.value = e.data?.message || t('currencies.failedSave')
  } finally {
    saving.value = false
  }
}

function startEdit(c: any) {
  editingId.value = c.id
  editForm.value = {
    name: c.name,
    symbol: c.symbol || '',
    valueInBase: c.valueInBase,
    sortOrder: c.sortOrder ?? 0,
  }
  editError.value = ''
}

function cancelEdit() {
  editingId.value = null
  editError.value = ''
}

async function saveEdit(currencyId: string) {
  if (!editForm.value.name.trim()) return
  saving.value = true
  editError.value = ''
  try {
    await api.updateCurrency(currencyId, editForm.value)
    editingId.value = null
    await load()
  } catch (e: any) {
    editError.value = e.data?.message || t('currencies.failedSave')
  } finally {
    saving.value = false
  }
}

function confirmDelete(c: any) {
  deletingCurrency.value = c
  showDeleteDialog.value = true
}

async function deleteCurrency() {
  if (!deletingCurrency.value) return
  saving.value = true
  try {
    await api.deleteCurrency(deletingCurrency.value.id)
    showDeleteDialog.value = false
    deletingCurrency.value = null
    await load()
  } catch {
    error.value = t('currencies.failedDelete')
    showDeleteDialog.value = false
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>
