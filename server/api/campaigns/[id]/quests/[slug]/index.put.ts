import { z } from 'zod'
import { eq, and } from 'drizzle-orm'
import { useDb } from '../../../../../utils/db'
import { validateBody } from '../../../../../utils/validate'
import { quests } from '../../../../../db/schema/sessions'
import { entities } from '../../../../../db/schema/entities'
import { hasMinRole } from '../../../../../utils/permissions'
import { canTransitionQuestStatus } from '../../../../../services/sessions'
import { resolveSubCampaignSlug } from '../../../../../utils/sub-campaign'
import type { CampaignRole } from '../../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const role = event.context.campaignRole as CampaignRole
  if (!hasMinRole(role, 'editor')) {
    throw createError({ statusCode: 403, message: 'Editors or above can update quests' })
  }

  const campaignId = getRouterParam(event, 'id')!
  const slug = getRouterParam(event, 'slug')!
  const questPutSchema = z.object({
    name: z.string().min(1).optional(),
    description: z.string().optional(),
    status: z.enum(['active', 'completed', 'failed', 'on_hold']).optional(),
    isSecret: z.boolean().optional(),
    subCampaignSlug: z.string().optional(),
  })
  const body = await validateBody(event, questPutSchema)
  const db = useDb()

  const quest = db
    .select()
    .from(quests)
    .where(and(eq(quests.campaignId, campaignId), eq(quests.slug, slug)))
    .get()
  if (!quest) throw createError({ statusCode: 404, message: 'Quest not found' })

  // Validate status transition
  if (body.status && body.status !== quest.status) {
    if (!canTransitionQuestStatus(quest.status, body.status)) {
      throw createError({
        statusCode: 400,
        message: `Cannot transition from ${quest.status} to ${body.status}`,
      })
    }
  }

  const now = new Date()
  const updates: Record<string, unknown> = { updatedAt: now }
  if (body.name !== undefined) updates.name = body.name
  if (body.description !== undefined) updates.description = body.description
  if (body.status !== undefined) updates.status = body.status
  if (body.isSecret !== undefined) updates.isSecret = body.isSecret
  if (body.subCampaignSlug !== undefined) {
    updates.subCampaignId = resolveSubCampaignSlug(db, campaignId, body.subCampaignSlug)
  }

  db.update(quests).set(updates).where(eq(quests.id, quest.id)).run()

  // Keep the mirror entity (quests.id === entities.id) in sync: name and secrecy are the only
  // fields the relation graph / entity lookup surface, so only those need mirroring.
  const entityUpdates: Record<string, unknown> = {}
  if (body.name !== undefined) entityUpdates.name = body.name
  if (body.isSecret !== undefined) entityUpdates.visibility = body.isSecret ? 'dm_only' : 'members'
  if (Object.keys(entityUpdates).length > 0) {
    entityUpdates.updatedAt = now
    db.update(entities).set(entityUpdates).where(eq(entities.id, quest.id)).run()
  }

  return { success: true }
})
