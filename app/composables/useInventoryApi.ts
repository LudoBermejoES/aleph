import type { Inventory, Item, Currency, Transaction, Shop, WealthBalance } from '~/types/api'

export function useInventoryApi(campaignId: string) {
  const base = `/api/campaigns/${campaignId}`

  // ─── Inventories ────────────────────────────────────────────────────────────

  function getInventories(params?: Record<string, string>) {
    return $fetch<Inventory[]>(`${base}/inventories`, { params })
  }

  function createInventory(body: Record<string, unknown>) {
    return $fetch<Inventory>(`${base}/inventories`, { method: 'POST', body })
  }

  function transferInventoryItems(fromInventoryId: string, body: Record<string, unknown>) {
    return $fetch(`${base}/inventories/${fromInventoryId}/transfer`, { method: 'POST', body })
  }

  function deleteInventory(inventoryId: string) {
    return $fetch(`${base}/inventories/${inventoryId}`, { method: 'DELETE' })
  }

  function deleteInventoryItem(inventoryId: string, itemId: string) {
    return $fetch(`${base}/inventories/${inventoryId}/items/${itemId}`, { method: 'DELETE' })
  }

  // ─── Items ──────────────────────────────────────────────────────────────────

  function getItems(params?: Record<string, string>) {
    return $fetch<Item[]>(`${base}/items`, { params })
  }

  function getItem(itemId: string) {
    return $fetch<Item>(`${base}/items/${itemId}`)
  }

  function createItem(body: Record<string, unknown>) {
    return $fetch<Item>(`${base}/items`, { method: 'POST', body })
  }

  function updateItem(itemId: string, body: Record<string, unknown>) {
    return $fetch<Item>(`${base}/items/${itemId}`, { method: 'PUT', body })
  }

  function deleteItem(itemId: string) {
    return $fetch(`${base}/items/${itemId}`, { method: 'DELETE' })
  }

  // ─── Currencies & Transactions ───────────────────────────────────────────────

  function getCurrencies() {
    return $fetch<Currency[]>(`${base}/currencies`)
  }

  function createCurrency(body: Record<string, unknown>) {
    return $fetch<Currency>(`${base}/currencies`, { method: 'POST', body })
  }

  function updateCurrency(currencyId: string, body: Record<string, unknown>) {
    return $fetch<Currency>(`${base}/currencies/${currencyId}`, { method: 'PUT', body })
  }

  function deleteCurrency(currencyId: string) {
    return $fetch(`${base}/currencies/${currencyId}`, { method: 'DELETE' })
  }

  function getTransactions(params?: Record<string, string>) {
    return $fetch<Transaction[]>(`${base}/transactions`, { params })
  }

  function getWealth(params?: { owner_id?: string; owner_type?: string }) {
    return $fetch<WealthBalance[]>(`${base}/wealth`, { params })
  }

  // ─── Shops ──────────────────────────────────────────────────────────────────

  function getShops() {
    return $fetch<Shop[]>(`${base}/shops`)
  }

  function getShop(slug: string) {
    return $fetch<Shop>(`${base}/shops/${slug}`)
  }

  function createShop(body: Record<string, unknown>) {
    return $fetch<Shop>(`${base}/shops`, { method: 'POST', body })
  }

  function updateShop(slug: string, body: Record<string, unknown>) {
    return $fetch<Shop>(`${base}/shops/${slug}`, { method: 'PUT', body })
  }

  function deleteShop(slug: string) {
    return $fetch(`${base}/shops/${slug}`, { method: 'DELETE' })
  }

  function addShopStock(slug: string, body: Record<string, unknown>) {
    return $fetch(`${base}/shops/${slug}/stock`, { method: 'POST', body })
  }

  function updateShopStock(slug: string, stockId: string, body: Record<string, unknown>) {
    return $fetch(`${base}/shops/${slug}/stock/${stockId}`, { method: 'PUT', body })
  }

  function deleteShopStock(slug: string, stockId: string) {
    return $fetch(`${base}/shops/${slug}/stock/${stockId}`, { method: 'DELETE' })
  }

  function createTransaction(body: Record<string, unknown>) {
    return $fetch(`${base}/transactions`, { method: 'POST', body })
  }

  // ─── Templates ──────────────────────────────────────────────────────────────

  function getTemplates() {
    return $fetch<Record<string, unknown>[]>(`${base}/templates`)
  }

  function getTemplate(templateId: string) {
    return $fetch<Record<string, unknown>>(`${base}/templates/${templateId}`)
  }

  function createTemplate(body: Record<string, unknown>) {
    return $fetch<Record<string, unknown>>(`${base}/templates`, { method: 'POST', body })
  }

  function updateTemplate(templateId: string, body: Record<string, unknown>) {
    return $fetch<Record<string, unknown>>(`${base}/templates/${templateId}`, {
      method: 'PUT',
      body,
    })
  }

  function deleteTemplate(templateId: string) {
    return $fetch(`${base}/templates/${templateId}`, { method: 'DELETE' })
  }

  return {
    // Inventories
    getInventories,
    createInventory,
    transferInventoryItems,
    deleteInventory,
    deleteInventoryItem,
    // Items
    getItems,
    getItem,
    createItem,
    updateItem,
    deleteItem,
    // Currencies & transactions
    getCurrencies,
    createCurrency,
    updateCurrency,
    deleteCurrency,
    getTransactions,
    getWealth,
    createTransaction,
    // Shops
    getShops,
    getShop,
    createShop,
    updateShop,
    deleteShop,
    addShopStock,
    updateShopStock,
    deleteShopStock,
    // Templates
    getTemplates,
    getTemplate,
    createTemplate,
    updateTemplate,
    deleteTemplate,
  }
}
