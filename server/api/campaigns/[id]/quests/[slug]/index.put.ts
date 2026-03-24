import { eq, and } from 'drizzle-orm'
import { useDb } from '../../../../../utils/db'
import { quests } from '../../../../../db/schema/sessions'
import { hasMinRole } from '../../../../../utils/permissions'
import { canTransitionQuestStatus } from '../../../../../services/sessions'
import type { CampaignRole } from '../../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const role = event.context.campaignRole as CampaignRole
  if (!hasMinRole(role, 'editor')) {
    throw createError({ statusCode: 403, message: 'Editors or above can update quests' })
  }

  const campaignId = getRouterParam(event, 'id')!
  const slug = getRouterParam(event, 'slug')!
  const body = await readBody(event)
  const db = useDb()

  const quest = db.select().from(quests)
    .where(and(eq(quests.campaignId, campaignId), eq(quests.slug, slug)))
    .get()
  if (!quest) throw createError({ statusCode: 404, message: 'Quest not found' })

  // Validate status transition
  if (body.status && body.status !== quest.status) {
    if (!canTransitionQuestStatus(quest.status, body.status)) {
      throw createError({ statusCode: 400, message: `Cannot transition from ${quest.status} to ${body.status}` })
    }
  }

  const updates: Record<string, unknown> = { updatedAt: new Date() }
  if (body.name !== undefined) updates.name = body.name
  if (body.description !== undefined) updates.description = body.description
  if (body.status !== undefined) updates.status = body.status
  if (body.isSecret !== undefined) updates.isSecret = body.isSecret

  db.update(quests).set(updates).where(eq(quests.id, quest.id)).run()

  return { success: true }
})
