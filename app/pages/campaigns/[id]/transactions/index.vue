<template>
  <div class="p-8">
    <div class="flex items-center gap-2 text-sm text-muted-foreground mb-1">
      <NuxtLink :to="`/campaigns/${campaignId}`" class="hover:text-primary"> {{ $t('common.campaign') }}</NuxtLink>
      <span>/</span>
      <span>{{ $t('transactions.title') }}</span>
    </div>

    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold">{{ $t('transactions.title') }}</h1>
      <button v-if="canEdit" @click="showForm = !showForm" class="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm" data-testid="new-transaction-btn">
        {{ showForm ? $t('common.cancel') : $t('transactions.new') }}
      </button>
    </div>

    <!-- Create transaction form -->
    <div v-if="showForm" class="mb-6 p-4 rounded-lg border border-border space-y-4" data-testid="transaction-form">
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="text-sm font-medium block mb-1">{{ $t('transactions.typeLabel') }}</label>
          <select v-model="txForm.type" class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" data-testid="tx-type-select">
            <option value="purchase">{{ $t('transactions.typePurchase') }}</option>
            <option value="sale">{{ $t('transactions.typeSale') }}</option>
            <option value="transfer">{{ $t('transactions.typeTransfer') }}</option>
            <option value="trade">{{ $t('transactions.typeTrade') }}</option>
            <option value="deposit">{{ $t('transactions.typeDeposit') }}</option>
            <option value="withdrawal">{{ $t('transactions.typeWithdrawal') }}</option>
            <option value="grant">{{ $t('transactions.typeGrant') }}</option>
            <option value="loot">{{ $t('transactions.loot') }}</option>
          </select>
        </div>
        <div>
          <label class="text-sm font-medium block mb-1">{{ $t('transactions.notes') }}</label>
          <input v-model="txForm.notes" class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" data-testid="tx-notes" />
        </div>
        <div>
          <label class="text-sm font-medium block mb-1">{{ $t('transactions.fromEntity') }}</label>
          <OwnerPicker :campaign-id="campaignId" :owner-type="txForm.fromType" v-model="txForm.fromId" data-testid="tx-from" />
          <select v-model="txForm.fromType" class="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-xs" data-testid="tx-from-type">
            <option value="party">{{ $t('inventories.typeParty') }}</option>
            <option value="character">{{ $t('inventories.typeCharacter') }}</option>
            <option value="faction">{{ $t('inventories.typeFaction') }}</option>
            <option value="shop">{{ $t('inventories.typeShop') }}</option>
          </select>
        </div>
        <div>
          <label class="text-sm font-medium block mb-1">{{ $t('transactions.toEntity') }}</label>
          <OwnerPicker :campaign-id="campaignId" :owner-type="txForm.toType" v-model="txForm.toId" data-testid="tx-to" />
          <select v-model="txForm.toType" class="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-xs" data-testid="tx-to-type">
            <option value="party">{{ $t('inventories.typeParty') }}</option>
            <option value="character">{{ $t('inventories.typeCharacter') }}</option>
            <option value="faction">{{ $t('inventories.typeFaction') }}</option>
            <option value="shop">{{ $t('inventories.typeShop') }}</option>
          </select>
        </div>
      </div>

      <!-- Item picker -->
      <div>
        <label class="text-sm font-medium block mb-1">{{ $t('transactions.item') }}</label>
        <select v-model="txForm.itemId" class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" data-testid="tx-item">
          <option value="">{{ $t('transactions.empty') }}</option>
          <option v-for="item in itemList" :key="item.id" :value="item.id">{{ item.name }}</option>
        </select>
      </div>

      <div v-if="txForm.itemId">
        <label class="text-sm font-medium block mb-1">{{ $t('transactions.quantity') }}</label>
        <input v-model.number="txForm.quantity" type="number" min="1" class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" data-testid="tx-quantity" />
      </div>

      <!-- Currency amounts (for wealth-modifying types) -->
      <div v-if="wealthModifying && currencyList.length">
        <label class="text-sm font-medium block mb-2">{{ $t('transactions.amounts') }}</label>
        <div class="grid grid-cols-2 gap-2">
          <div v-for="c in currencyList" :key="c.id" class="flex items-center gap-2">
            <span class="text-sm text-muted-foreground w-20">{{ c.name }}<span v-if="c.symbol"> ({{ c.symbol }})</span></span>
            <input v-model.number="txForm.amounts[c.id]" type="number" min="0" placeholder="0" class="flex-1 rounded-md border border-input bg-background px-2 py-1.5 text-sm" :data-testid="`tx-amount-${c.id}`" />
          </div>
        </div>
      </div>

      <p v-if="formError" class="text-sm text-destructive">{{ formError }}</p>
      <button @click="createTx" :disabled="saving" class="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm disabled:opacity-50" data-testid="tx-save">
        {{ saving ? $t('common.saving') : $t('transactions.create') }}
      </button>
    </div>

    <!-- Filters -->
    <div class="flex gap-3 mb-4">
      <select v-model="typeFilter" @change="load" class="rounded-md border border-input bg-background px-3 py-2 text-sm" data-testid="tx-type-filter">
        <option value="">{{ $t('transactions.allTypes') }}</option>
        <option value="purchase">{{ $t('transactions.typePurchase') }}</option>
        <option value="sale">{{ $t('transactions.typeSale') }}</option>
        <option value="transfer">{{ $t('transactions.typeTransfer') }}</option>
        <option value="trade">{{ $t('transactions.typeTrade') }}</option>
        <option value="deposit">{{ $t('transactions.typeDeposit') }}</option>
        <option value="withdrawal">{{ $t('transactions.typeWithdrawal') }}</option>
        <option value="grant">{{ $t('transactions.typeGrant') }}</option>
      </select>
    </div>

    <LoadingSkeleton v-if="loading" :rows="5" />
    <ScrollableTable v-else-if="txList.length" class="rounded-lg border border-border" data-testid="transaction-table">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-border bg-muted/50">
            <th class="px-4 py-2 text-left font-medium text-muted-foreground">{{ $t('transactions.typeLabel') }}</th>
            <th class="px-4 py-2 text-left font-medium text-muted-foreground">{{ $t('transactions.description') }}</th>
            <th class="px-4 py-2 text-left font-medium text-muted-foreground">{{ $t('transactions.item') }}</th>
            <th class="px-4 py-2 text-right font-medium text-muted-foreground">{{ $t('transactions.amount') }}</th>
            <th class="px-4 py-2 text-right font-medium text-muted-foreground">{{ $t('transactions.date') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="tx in txList"
            :key="tx.id"
            class="border-b border-border/50 hover:bg-muted/30"
            :data-testid="`tx-row-${tx.id}`"
          >
            <td class="px-4 py-2">
              <span :class="['px-2 py-0.5 rounded text-xs', typeColor(tx.type)]">{{ tx.type }}</span>
            </td>
            <td class="px-4 py-2 text-muted-foreground">{{ tx.notes || $t('transactions.empty') }}</td>
            <td class="px-4 py-2">{{ tx.itemId ? (itemMap[tx.itemId] || tx.itemId) : $t('transactions.empty') }}</td>
            <td class="px-4 py-2 text-right">
              <span v-if="tx.amount">{{ tx.amount }}</span>
              <span v-else-if="tx.quantity">×{{ tx.quantity }}</span>
              <span v-else>{{ $t('transactions.empty') }}</span>
            </td>
            <td class="px-4 py-2 text-right text-muted-foreground">{{ formatDate(tx.createdAt) }}</td>
          </tr>
        </tbody>
      </table>
    </ScrollableTable>
    <EmptyState v-else icon="📜" :title="$t('transactions.noTransactions')" :description="$t('transactions.noTransactionsDescription')" />

    <ErrorToast v-if="error" :message="error" @dismiss="error = ''" />
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const campaignId = route.params.id as string
const api = useCampaignApi(campaignId)
const { t } = useI18n()
const txList = ref<any[]>([])
const loading = ref(true)
const error = ref('')
const typeFilter = ref('')
const showForm = ref(false)
const saving = ref(false)
const formError = ref('')
const itemList = ref<any[]>([])
const currencyList = ref<any[]>([])
const campaign = ref<any>(null)

const canEdit = computed(() => {
  const role = campaign.value?.role
  return role === 'dm' || role === 'co_dm' || role === 'editor'
})

const itemMap = computed(() => {
  const map: Record<string, string> = {}
  for (const item of itemList.value) map[item.id] = item.name
  return map
})

const wealthModifying = computed(() =>
  ['grant', 'deposit', 'withdrawal', 'loot'].includes(txForm.value.type)
)

const txForm = ref({
  type: 'purchase',
  notes: '',
  fromType: 'party',
  fromId: '',
  toType: 'character',
  toId: '',
  itemId: '',
  quantity: 1,
  amounts: {} as Record<string, number>,
})

function typeColor(type: string) {
  const map: Record<string, string> = {
    purchase: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
    sale: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
    transfer: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
    trade: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
    deposit: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
    withdrawal: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
    grant: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
    loot: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
  }
  return map[type] || 'bg-secondary text-secondary-foreground'
}

function formatDate(d: string | Date) {
  return new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

async function load() {
  loading.value = true
  try {
    const params: Record<string, string> = {}
    if (typeFilter.value) params.type = typeFilter.value
    txList.value = await api.getTransactions(params)
  } catch {
    error.value = t('errors.failedLoad')
  } finally {
    loading.value = false
  }
}

async function createTx() {
  saving.value = true
  formError.value = ''
  try {
    const body: Record<string, unknown> = {
      type: txForm.value.type,
      notes: txForm.value.notes || undefined,
      fromId: txForm.value.fromId || undefined,
      toId: txForm.value.toId || undefined,
      itemId: txForm.value.itemId || undefined,
      quantity: txForm.value.itemId ? txForm.value.quantity : undefined,
    }
    if (wealthModifying.value) {
      const nonZero: Record<string, number> = {}
      for (const [k, v] of Object.entries(txForm.value.amounts)) {
        if (v && v > 0) nonZero[k] = v
      }
      if (Object.keys(nonZero).length) body.amount = JSON.stringify(nonZero)
    }
    await api.createTransaction(body)
    txForm.value = { type: 'purchase', notes: '', fromType: 'party', fromId: '', toType: 'character', toId: '', itemId: '', quantity: 1, amounts: {} }
    showForm.value = false
    await load()
  } catch (e: any) {
    formError.value = e.data?.message || t('errors.failedLoad')
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  const [, items, currencies, camp] = await Promise.allSettled([
    load(),
    api.getItems().catch(() => []),
    api.getCurrencies().catch(() => []),
    api.getCampaign().catch(() => null),
  ])
  if (items.status === 'fulfilled') itemList.value = items.value
  if (currencies.status === 'fulfilled') currencyList.value = currencies.value
  if (camp.status === 'fulfilled') campaign.value = camp.value
})
</script>
