<template>
  <div class="p-8">
    <LoadingSkeleton v-if="loading" :rows="3" />
    <ErrorToast v-if="error" :message="error" @dismiss="error = null" />
    <div v-else-if="shop">
      <div class="flex items-center gap-2 text-sm text-muted-foreground mb-4">
        <NuxtLink :to="`/campaigns/${campaignId}`" class="hover:text-primary">
          {{ $t('common.campaign') }}</NuxtLink
        >
        <span>/</span>
        <NuxtLink :to="`/campaigns/${campaignId}/shops`" class="hover:text-primary">{{
          $t('shops.title')
        }}</NuxtLink>
        <span>/</span>
        <span class="text-foreground">{{ shop.name }}</span>
      </div>

      <h1 class="text-2xl font-bold mb-2">{{ shop.name }}</h1>
      <p v-if="shop.description" class="text-muted-foreground mb-6">{{ shop.description }}</p>

      <div class="flex items-center justify-between mb-3">
        <h2 class="text-lg font-semibold">{{ $t('shops.stock') }}</h2>
        <button
          v-if="canEdit"
          class="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm"
          data-testid="add-stock-btn"
          @click="showAddForm = !showAddForm"
        >
          {{ showAddForm ? $t('common.cancel') : $t('shops.addStock') }}
        </button>
      </div>

      <!-- Add stock form -->
      <div
        v-if="showAddForm"
        class="mb-4 p-4 rounded-lg border border-border space-y-3"
        data-testid="add-stock-form"
      >
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-sm font-medium block mb-1">{{ $t('transactions.item') }}</label>
            <select
              v-model="addForm.itemId"
              class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              data-testid="stock-item-select"
            >
              <option value="">{{ $t('transactions.empty') }}</option>
              <option v-for="item in itemList" :key="item.id" :value="item.id">
                {{ item.name }}
              </option>
            </select>
          </div>
          <div>
            <label class="text-sm font-medium block mb-1">{{ $t('shops.quantity') }}</label>
            <div class="flex items-center gap-2">
              <input
                v-model.number="addForm.quantity"
                type="number"
                :min="addForm.quantity === -1 ? -1 : 0"
                class="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                data-testid="stock-quantity"
              />
              <label class="flex items-center gap-1 text-xs text-muted-foreground cursor-pointer">
                <input
                  type="checkbox"
                  :checked="addForm.quantity === -1"
                  data-testid="stock-unlimited"
                  @change="addForm.quantity = ($event.target as HTMLInputElement).checked ? -1 : 1"
                />
                {{ $t('shops.unlimitedLabel') }}
              </label>
            </div>
          </div>
          <div class="col-span-2">
            <label class="text-sm font-medium block mb-1">{{ $t('shops.availability') }}</label>
            <label class="flex items-center gap-2 text-sm cursor-pointer">
              <input v-model="addForm.isAvailable" type="checkbox" data-testid="stock-available" />
              {{ addForm.isAvailable ? $t('shops.available') : $t('shops.unavailable') }}
            </label>
          </div>
        </div>
        <p v-if="stockError" class="text-sm text-destructive">{{ stockError }}</p>
        <button
          :disabled="!addForm.itemId || saving"
          class="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm disabled:opacity-50"
          data-testid="stock-add-save"
          @click="addStock"
        >
          {{ saving ? $t('common.saving') : $t('common.save') }}
        </button>
      </div>

      <div v-if="shop.stock?.length" class="space-y-2">
        <div
          v-for="item in shop.stock"
          :key="item.id"
          class="p-3 rounded border border-border"
          :data-testid="`stock-row-${item.id}`"
        >
          <!-- View mode -->
          <div v-if="editingStockId !== item.id" class="flex items-center justify-between">
            <div>
              <span class="font-medium">{{ item.itemName }}</span>
              <span
                :class="[
                  'text-xs ml-2 px-2 py-0.5 rounded',
                  item.itemRarity === 'legendary'
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-secondary text-secondary-foreground',
                ]"
                >{{ item.itemRarity }}</span
              >
              <span v-if="!item.isAvailable" class="text-xs ml-2 text-muted-foreground"
                >({{ $t('shops.unavailable') }})</span
              >
            </div>
            <div class="flex items-center gap-3">
              <span class="text-sm text-muted-foreground"
                >{{ item.quantity === -1 ? $t('shops.unlimited') : item.quantity }}
                {{ $t('shops.inStock') }}</span
              >
              <span v-if="item.priceOverrideJson || item.itemPriceJson" class="text-sm">{{
                formatPrice(item.priceOverrideJson || item.itemPriceJson, currencyList)
              }}</span>
              <div v-if="canEdit" class="flex gap-2">
                <button
                  class="text-sm text-muted-foreground hover:text-primary"
                  :data-testid="`stock-edit-${item.id}`"
                  @click="startEditStock(item)"
                >
                  {{ $t('common.edit') }}
                </button>
                <button
                  class="text-sm text-muted-foreground hover:text-destructive"
                  :data-testid="`stock-remove-${item.id}`"
                  @click="confirmRemoveStock(item)"
                >
                  {{ $t('shops.removeStock') }}
                </button>
              </div>
            </div>
          </div>

          <!-- Inline edit -->
          <div v-else class="space-y-3" :data-testid="`stock-edit-form-${item.id}`">
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="text-sm font-medium block mb-1">{{ $t('shops.quantity') }}</label>
                <div class="flex items-center gap-2">
                  <input
                    v-model.number="editStockForm.quantity"
                    type="number"
                    class="flex-1 rounded-md border border-input bg-background px-2 py-1.5 text-sm"
                    :data-testid="`stock-edit-qty-${item.id}`"
                  />
                  <label class="flex items-center gap-1 text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      :checked="editStockForm.quantity === -1"
                      @change="
                        editStockForm.quantity = ($event.target as HTMLInputElement).checked
                          ? -1
                          : 1
                      "
                    />
                    {{ $t('shops.unlimitedLabel') }}
                  </label>
                </div>
              </div>
              <div>
                <label class="text-sm font-medium block mb-1">{{ $t('shops.availability') }}</label>
                <label class="flex items-center gap-2 text-sm cursor-pointer mt-2">
                  <input
                    v-model="editStockForm.isAvailable"
                    type="checkbox"
                    :data-testid="`stock-edit-avail-${item.id}`"
                  />
                  {{ editStockForm.isAvailable ? $t('shops.available') : $t('shops.unavailable') }}
                </label>
              </div>
            </div>
            <div class="flex gap-2">
              <button
                :disabled="saving"
                class="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm disabled:opacity-50"
                :data-testid="`stock-edit-save-${item.id}`"
                @click="saveStock(item.id)"
              >
                {{ saving ? $t('common.saving') : $t('common.save') }}
              </button>
              <button
                class="px-3 py-1.5 rounded-md border border-border text-sm"
                :data-testid="`stock-edit-cancel-${item.id}`"
                @click="editingStockId = null"
              >
                {{ $t('common.cancel') }}
              </button>
            </div>
          </div>
        </div>
      </div>
      <p v-else class="text-muted-foreground">{{ $t('shops.noStock') }}</p>
    </div>

    <!-- Remove stock confirmation -->
    <Dialog v-model:open="showRemoveDialog">
      <DialogContent class="max-w-sm">
        <DialogHeader>
          <DialogTitle>{{ $t('shops.removeStock') }}</DialogTitle>
        </DialogHeader>
        <p class="text-sm text-muted-foreground py-2">{{ $t('shops.confirmRemoveStock') }}</p>
        <DialogFooter>
          <button
            class="px-3 py-1.5 rounded-md border border-border text-sm"
            data-testid="stock-remove-cancel"
            @click="showRemoveDialog = false"
          >
            {{ $t('common.cancel') }}
          </button>
          <button
            :disabled="saving"
            class="px-3 py-1.5 rounded-md bg-destructive text-destructive-foreground text-sm disabled:opacity-50"
            data-testid="stock-remove-confirm"
            @click="removeStock"
          >
            {{ saving ? $t('common.deleting') : $t('shops.removeStock') }}
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
import { formatPrice } from '~/composables/useFormatPrice'
import type { Shop, ShopStockItem, Item, Currency, Campaign } from '~/types/api'

interface ShopWithStock extends Shop {
  stock?: (ShopStockItem & Record<string, unknown>)[]
}

const route = useRoute()
const campaignId = route.params.id as string
const slug = route.params.slug as string
const api = useCampaignApi(campaignId)
const shop = ref<ShopWithStock | null>(null)
const itemList = ref<Item[]>([])
const currencyList = ref<Currency[]>([])
const campaign = ref<(Campaign & { role?: string }) | null>(null)
const { loading, error, withLoading } = useLoadingState()

const canEdit = computed(() => {
  const role = campaign.value?.role
  return role === 'dm' || role === 'co_dm' || role === 'editor'
})

const showAddForm = ref(false)
const saving = ref(false)
const stockError = ref('')
const addForm = ref({ itemId: '', quantity: 1, isAvailable: true })

const editingStockId = ref<string | null>(null)
const editStockForm = ref({ quantity: 1, isAvailable: true, priceOverrideJson: '' })

const showRemoveDialog = ref(false)
const removingStock = ref<ShopStockItem | null>(null)

async function load() {
  await withLoading(async () => {
    shop.value = await api.getShop(slug)
  })
}

async function addStock() {
  if (!addForm.value.itemId) return
  saving.value = true
  stockError.value = ''
  try {
    await api.addShopStock(slug, {
      itemId: addForm.value.itemId,
      quantity: addForm.value.quantity,
      isAvailable: addForm.value.isAvailable,
    })
    addForm.value = { itemId: '', quantity: 1, isAvailable: true }
    showAddForm.value = false
    await load()
  } catch (e: unknown) {
    stockError.value =
      (e as { data?: { message?: string } })?.data?.message || 'Failed to add stock'
  } finally {
    saving.value = false
  }
}

function startEditStock(item: ShopStockItem) {
  editingStockId.value = item.id
  editStockForm.value = {
    quantity: item.quantity,
    isAvailable: item.isAvailable ?? true,
    priceOverrideJson: item.priceOverrideJson || '',
  }
}

async function saveStock(stockId: string) {
  saving.value = true
  try {
    await api.updateShopStock(slug, stockId, {
      quantity: editStockForm.value.quantity,
      isAvailable: editStockForm.value.isAvailable,
      priceOverrideJson: editStockForm.value.priceOverrideJson || null,
    })
    editingStockId.value = null
    await load()
  } catch {
    stockError.value = 'Failed to update stock'
  } finally {
    saving.value = false
  }
}

function confirmRemoveStock(item: ShopStockItem) {
  removingStock.value = item
  showRemoveDialog.value = true
}

async function removeStock() {
  if (!removingStock.value) return
  saving.value = true
  try {
    await api.deleteShopStock(slug, removingStock.value.id)
    showRemoveDialog.value = false
    removingStock.value = null
    await load()
  } catch {
    error.value = 'Failed to remove stock'
    showRemoveDialog.value = false
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  await load()
  const [items, currencies, camp] = await Promise.allSettled([
    api.getItems().catch(() => []),
    api.getCurrencies().catch(() => []),
    api.getCampaign().catch(() => null),
  ])
  if (items.status === 'fulfilled') itemList.value = items.value
  if (currencies.status === 'fulfilled') currencyList.value = currencies.value
  if (camp.status === 'fulfilled') campaign.value = camp.value
})
</script>
