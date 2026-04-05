export interface PriceCurrency {
  id: string
  name: string
  symbol?: string | null
}

/**
 * Formats a priceJson string (e.g. '{"gold":50,"silver":5}') into a
 * human-readable string like "50 gp, 5 sp".
 *
 * Keys are matched against currencies by `id` first, then by `name`.
 * Falls back to raw key if no currency matches.
 * Returns empty string for empty/null price.
 */
export function formatPrice(priceJson: string | null | undefined, currencies: PriceCurrency[]): string {
  if (!priceJson) return ''

  let parsed: Record<string, number>
  try {
    parsed = JSON.parse(priceJson)
  } catch {
    return priceJson
  }

  if (typeof parsed !== 'object' || parsed === null) return priceJson

  const parts: string[] = []
  for (const [key, amount] of Object.entries(parsed)) {
    if (typeof amount !== 'number' || amount === 0) continue
    const currency = currencies.find(c => c.id === key || c.name.toLowerCase() === key.toLowerCase())
    const label = currency ? (currency.symbol || currency.name) : key
    parts.push(`${amount} ${label}`)
  }

  return parts.join(', ')
}

export function useFormatPrice() {
  function format(priceJson: string | null | undefined, currencies: PriceCurrency[]): string {
    return formatPrice(priceJson, currencies)
  }

  return { format }
}
