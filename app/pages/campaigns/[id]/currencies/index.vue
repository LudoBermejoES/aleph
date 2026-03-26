<template>
  <div class="p-8">
    <div class="flex items-center gap-2 text-sm text-muted-foreground mb-1">
      <NuxtLink :to="`/campaigns/${campaignId}`" class="hover:text-primary">Campaign</NuxtLink>
      <span>/</span>
      <span>Currencies</span>
    </div>

    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold">Currencies</h1>
      <button @click="showForm = !showForm" class="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm" data-testid="new-currency-btn">
        {{ showForm ? 'Cancel' : 'New Currency' }}
      </button>
    </div>

    <!-- Create form -->
    <div v-if="showForm" class="mb-6 p-4 rounded-lg border border-border space-y-3" data-testid="currency-form">
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="text-sm font-medium block mb-1">Name</label>
          <input v-model="form.name" placeholder="Gold" class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" data-testid="currency-name" />
        </div>
        <div>
          <label class="text-sm font-medium block mb-1">Symbol</label>
          <input v-model="form.symbol" placeholder="gp" class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" data-testid="currency-symbol" />
        </div>
        <div>
          <label class="text-sm font-medium block mb-1">Value in base units</label>
          <input v-model.number="form.valueInBase" type="number" min="1" placeholder="100" class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" data-testid="currency-value" />
        </div>
        <div>
          <label class="text-sm font-medium block mb-1">Sort order</label>
          <input v-model.number="form.sortOrder" type="number" min="0" placeholder="0" class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" data-testid="currency-sort" />
        </div>
      </div>
      <p v-if="formError" class="text-sm text-destructive">{{ formError }}</p>
      <button @click="create" :disabled="!form.name.trim() || saving" class="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm disabled:opacity-50" data-testid="currency-save">
        {{ saving ? 'Saving…' : 'Save' }}
      </button>
    </div>

    <LoadingSkeleton v-if="loading" :rows="3" />
    <div v-else-if="currencyList.length" class="space-y-2">
      <div
        v-for="c in currencyList"
        :key="c.id"
        class="p-3 rounded border border-border flex items-center justify-between"
        :data-testid="`currency-row-${c.id}`"
      >
        <div class="flex items-center gap-3">
          <span class="font-medium">{{ c.name }}</span>
          <span v-if="c.symbol" class="text-xs px-2 py-0.5 rounded bg-secondary text-secondary-foreground">{{ c.symbol }}</span>
        </div>
        <span class="text-sm text-muted-foreground">1 base = {{ c.valueInBase }} units</span>
      </div>
    </div>
    <EmptyState v-else icon="💰" title="No currencies yet" description="Create currencies to track character wealth." />

    <ErrorToast v-if="error" :message="error" @dismiss="error = ''" />
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const campaignId = route.params.id as string
const api = useCampaignApi(campaignId)
const currencyList = ref<any[]>([])
const loading = ref(true)
const error = ref('')
const showForm = ref(false)
const saving = ref(false)
const formError = ref('')
const form = ref({ name: '', symbol: '', valueInBase: 1, sortOrder: 0 })

async function load() {
  loading.value = true
  try {
    currencyList.value = await api.getCurrencies()
  } catch {
    error.value = 'Failed to load currencies'
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
    formError.value = e.data?.message || 'Failed to create currency'
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>
