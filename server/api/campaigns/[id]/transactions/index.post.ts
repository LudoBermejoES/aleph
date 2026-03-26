import { randomUUID } from 'crypto'
import { eq, and } from 'drizzle-orm'
import { useDb } from '../../../../utils/db'
import { transactions, wealth } from '../../../../db/schema/inventory'
import { hasMinRole } from '../../../../utils/permissions'
import type { CampaignRole } from '../../../../utils/permissions'

// Types that modify wealth when created via this endpoint
const WEALTH_MODIFYING_TYPES = new Set(['grant', 'deposit', 'withdrawal', 'loot'])

export default defineEventHandler(async (event) => {
  const role = event.context.campaignRole as CampaignRole
  if (!hasMinRole(role, 'editor')) throw createError({ statusCode: 403, message: 'Editors or above can log transactions' })

  const campaignId = getRouterParam(event, 'id')!
  const body = await readBody(event)
  const db = useDb()
  const id = randomUUID()
  const type = body.type || 'trade'

  db.insert(transactions).values({
    id,
    campaignId,
    type,
    fromEntityId: body.fromEntityId || null,
    toEntityId: body.toEntityId || null,
    itemId: body.itemId || null,
    quantity: body.quantity || null,
    amountsJson: body.amounts ? JSON.stringify(body.amounts) : null,
    notes: body.notes || null,
    createdAt: new Date(),
  }).run()

  // Apply wealth changes for grant/deposit/withdrawal/loot types
  // amounts: { [currencyId]: number } — positive = credit toEntityId, negative = debit fromEntityId
  if (WEALTH_MODIFYING_TYPES.has(type) && body.amounts && typeof body.amounts === 'object') {
    for (const [currencyId, amount] of Object.entries(body.amounts as Record<string, number>)) {
      const delta = Number(amount)
      if (delta === 0) continue

      // Positive delta: credit the recipient (toEntityId / toOwnerType + toOwnerId)
      if (delta > 0 && body.toOwnerId && body.toOwnerType) {
        const existing = db.select().from(wealth)
          .where(and(eq(wealth.ownerId, body.toOwnerId), eq(wealth.ownerType, body.toOwnerType), eq(wealth.currencyId, currencyId)))
          .get()
        if (existing) {
          db.update(wealth).set({ amount: existing.amount + delta }).where(eq(wealth.id, existing.id)).run()
        } else {
          db.insert(wealth).values({ id: randomUUID(), ownerType: body.toOwnerType, ownerId: body.toOwnerId, currencyId, amount: delta }).run()
        }
      }

      // Negative delta (withdrawal): debit the source (fromOwnerId / fromOwnerType)
      if (delta < 0 && body.fromOwnerId && body.fromOwnerType) {
        const existing = db.select().from(wealth)
          .where(and(eq(wealth.ownerId, body.fromOwnerId), eq(wealth.ownerType, body.fromOwnerType), eq(wealth.currencyId, currencyId)))
          .get()
        if (existing) {
          db.update(wealth).set({ amount: existing.amount + delta }).where(eq(wealth.id, existing.id)).run()
        }
      }
    }
  }

  return { id }
})
