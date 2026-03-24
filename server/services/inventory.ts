// --- Currency Validation ---

interface ValidationResult {
  valid: boolean
  error?: string
}

/**
 * Validate currency amounts (all values must be non-negative numbers).
 */
export function validateCurrencyAmount(amounts: Record<string, number>): ValidationResult {
  for (const [key, value] of Object.entries(amounts)) {
    if (typeof value !== 'number' || isNaN(value)) {
      return { valid: false, error: `Invalid amount for ${key}: must be a number` }
    }
    if (value < 0) {
      return { valid: false, error: `Invalid negative amount for ${key}` }
    }
  }
  return { valid: true }
}

// --- Price Calculation ---

interface CurrencyDef {
  id: string
  name: string
  valueInBase: number
}

/**
 * Convert a base value into denominated currency amounts.
 * Currencies must be sorted by valueInBase descending.
 */
export function calculateTotalPrice(
  baseValue: number,
  currencies: CurrencyDef[],
): Record<string, number> {
  const sorted = [...currencies].sort((a, b) => b.valueInBase - a.valueInBase)
  const result: Record<string, number> = {}
  let remaining = baseValue

  for (const c of sorted) {
    result[c.id] = Math.floor(remaining / c.valueInBase)
    remaining = remaining % c.valueInBase
  }

  return result
}

/**
 * Convert denominated amounts to base value.
 */
calculateTotalPrice.toBase = function (
  amounts: Record<string, number>,
  currencies: CurrencyDef[],
): number {
  let total = 0
  for (const c of currencies) {
    total += (amounts[c.id] || 0) * c.valueInBase
  }
  return total
}

// --- Transfer Validation ---

interface TransferCheck {
  currentQuantity: number
  transferQuantity: number
}

interface TransferResult {
  allowed: boolean
  error?: string
}

/**
 * Check if an item transfer is valid.
 */
export function canTransferItem(check: TransferCheck): TransferResult {
  if (check.transferQuantity <= 0) {
    return { allowed: false, error: 'Transfer quantity must be positive' }
  }
  if (check.currentQuantity < check.transferQuantity) {
    return { allowed: false, error: `Insufficient quantity: have ${check.currentQuantity}, need ${check.transferQuantity}` }
  }
  return { allowed: true }
}

// --- Transaction Processing ---

interface TransactionInput {
  type: 'purchase' | 'sale' | 'loot' | 'trade' | 'gift' | 'loss'
  fromId: string | null
  toId: string | null
  itemId: string | null
  quantity: number
  amounts: Record<string, number>
}

interface TransactionRecord extends TransactionInput {
  timestamp: string
}

/**
 * Build a transaction record from input.
 */
export function processTransaction(input: TransactionInput): TransactionRecord {
  return {
    ...input,
    timestamp: new Date().toISOString(),
  }
}
