<template>
  <div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" @click.self="$emit('close')">
    <div class="bg-background rounded-lg border border-border w-full max-w-md p-6 shadow-xl" data-testid="transfer-dialog">
      <h2 class="text-lg font-semibold mb-4">Transfer Item</h2>

      <div class="space-y-4">
        <!-- Item selector -->
        <div>
          <label class="text-sm font-medium block mb-1">Item</label>
          <select v-model="selectedItemId" class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" data-testid="transfer-item-select">
            <option value="">Select item…</option>
            <option v-for="it in items" :key="it.id" :value="it.itemId">
              {{ it.itemName }} (×{{ it.quantity }})
            </option>
          </select>
        </div>

        <!-- Quantity -->
        <div>
          <label class="text-sm font-medium block mb-1">Quantity</label>
          <input
            v-model.number="quantity"
            type="number"
            min="1"
            :max="selectedItem?.quantity || 1"
            class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            data-testid="transfer-quantity"
          />
        </div>

        <!-- Target inventory -->
        <div>
          <label class="text-sm font-medium block mb-1">To Inventory</label>
          <select v-model="targetInventoryId" class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" data-testid="transfer-target-select">
            <option value="">Select target…</option>
            <option v-for="inv in targetInventories" :key="inv.id" :value="inv.id">
              {{ inv.name }} ({{ inv.ownerType }})
            </option>
          </select>
        </div>

        <p v-if="error" class="text-sm text-destructive" data-testid="transfer-error">{{ error }}</p>
      </div>

      <div class="flex justify-end gap-2 mt-6">
        <button @click="$emit('close')" class="px-4 py-2 rounded-md border border-border text-sm hover:bg-accent">Cancel</button>
        <button
          @click="submit"
          :disabled="!canSubmit || loading"
          class="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm disabled:opacity-50"
          data-testid="transfer-submit"
        >
          {{ loading ? 'Transferring…' : 'Transfer' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  campaignId: string
  fromInventoryId: string
  items: Array<{ id: string; itemId: string; itemName: string; itemRarity: string; quantity: number }>
}>()

const emit = defineEmits<{ close: []; transferred: [] }>()

const selectedItemId = ref('')
const quantity = ref(1)
const targetInventoryId = ref('')
const targetInventories = ref<any[]>([])
const loading = ref(false)
const error = ref('')

const selectedItem = computed(() => props.items.find(i => i.itemId === selectedItemId.value))

const canSubmit = computed(
  () => selectedItemId.value && targetInventoryId.value && quantity.value >= 1
    && quantity.value <= (selectedItem.value?.quantity || 0),
)

async function loadTargets() {
  try {
    const all = await useCampaignApi(props.campaignId).getInventories()
    targetInventories.value = all.filter((i: { id: string }) => i.id !== props.fromInventoryId)
  } catch {
    targetInventories.value = []
  }
}

async function submit() {
  if (!canSubmit.value) return
  loading.value = true
  error.value = ''
  try {
    await useCampaignApi(props.campaignId).transferInventoryItems(props.fromInventoryId, {
      toInventoryId: targetInventoryId.value, itemId: selectedItemId.value, quantity: quantity.value,
    })
    emit('transferred')
  } catch (e: any) {
    error.value = e.data?.message || 'Transfer failed'
  } finally {
    loading.value = false
  }
}

onMounted(loadTargets)
</script>
