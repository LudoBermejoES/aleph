import { eq } from 'drizzle-orm'
import { useDb } from '../../../../../../../utils/db'
import { abilities } from '../../../../../../../db/schema/characters'
import { hasMinRole } from '../../../../../../../utils/permissions'
import type { CampaignRole } from '../../../../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const role = event.context.campaignRole as CampaignRole
  if (!hasMinRole(role, 'editor')) {
    throw createError({ statusCode: 403, message: 'Editors or above can edit abilities' })
  }

  const abilityId = getRouterParam(event, 'abilityId')!
  const body = await readBody(event)
  const db = useDb()

  const updates: Record<string, unknown> = {}
  if (body.name !== undefined) updates.name = body.name
  if (body.type !== undefined) updates.type = body.type
  if (body.description !== undefined) updates.description = body.description
  if (body.sortOrder !== undefined) updates.sortOrder = body.sortOrder
  if (body.isSecret !== undefined) updates.isSecret = body.isSecret
  if (body.tags !== undefined) updates.tagsJson = JSON.stringify(body.tags)

  db.update(abilities).set(updates).where(eq(abilities.id, abilityId)).run()

  return { success: true }
})
