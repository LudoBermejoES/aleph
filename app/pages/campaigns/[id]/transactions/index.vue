<template>
  <div class="p-8">
    <div class="flex items-center gap-2 text-sm text-muted-foreground mb-1">
      <NuxtLink :to="`/campaigns/${campaignId}`" class="hover:text-primary">Campaign</NuxtLink>
      <span>/</span>
      <span>Transactions</span>
    </div>

    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold">Transaction History</h1>
    </div>

    <!-- Filters -->
    <div class="flex gap-3 mb-4">
      <select v-model="typeFilter" @change="load" class="rounded-md border border-input bg-background px-3 py-2 text-sm" data-testid="tx-type-filter">
        <option value="">All Types</option>
        <option value="purchase">Purchase</option>
        <option value="sale">Sale</option>
        <option value="transfer">Transfer</option>
        <option value="trade">Trade</option>
        <option value="deposit">Deposit</option>
        <option value="withdrawal">Withdrawal</option>
        <option value="grant">Grant</option>
      </select>
    </div>

    <LoadingSkeleton v-if="loading" :rows="5" />
    <div v-else-if="txList.length" class="rounded-lg border border-border overflow-hidden" data-testid="transaction-table">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-border bg-muted/50">
            <th class="px-4 py-2 text-left font-medium text-muted-foreground">Type</th>
            <th class="px-4 py-2 text-left font-medium text-muted-foreground">Description</th>
            <th class="px-4 py-2 text-left font-medium text-muted-foreground">Item</th>
            <th class="px-4 py-2 text-right font-medium text-muted-foreground">Amount</th>
            <th class="px-4 py-2 text-right font-medium text-muted-foreground">Date</th>
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
            <td class="px-4 py-2 text-muted-foreground">{{ tx.description || '—' }}</td>
            <td class="px-4 py-2">{{ tx.itemId ? tx.itemId : '—' }}</td>
            <td class="px-4 py-2 text-right">
              <span v-if="tx.amount">{{ tx.amount }}</span>
              <span v-else-if="tx.quantity">×{{ tx.quantity }}</span>
              <span v-else>—</span>
            </td>
            <td class="px-4 py-2 text-right text-muted-foreground">{{ formatDate(tx.createdAt) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <EmptyState v-else icon="📜" title="No transactions yet" description="Transactions appear here after purchases, transfers, and grants." />

    <ErrorToast v-if="error" :message="error" @dismiss="error = ''" />
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const campaignId = route.params.id as string
const txList = ref<any[]>([])
const loading = ref(true)
const error = ref('')
const typeFilter = ref('')

function typeColor(type: string) {
  const map: Record<string, string> = {
    purchase: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
    sale: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
    transfer: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
    trade: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
    deposit: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
    withdrawal: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
    grant: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
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
    txList.value = await $fetch(`/api/campaigns/${campaignId}/transactions`, { params }) as any[]
  } catch {
    error.value = 'Failed to load transactions'
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>
