import { z } from 'zod'
import { eq, and } from 'drizzle-orm'
import { useDb } from '../../../../../utils/db'
import { validateBody } from '../../../../../utils/validate'
import { sessionGroups } from '../../../../../db/schema/sessions'
import { hasMinRole } from '../../../../../utils/permissions'
import type { CampaignRole } from '../../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const role = event.context.campaignRole as CampaignRole
  if (!hasMinRole(role, 'editor')) {
    throw createError({ statusCode: 403, message: 'Editors or above can update session groups' })
  }

  const campaignId = getRouterParam(event, 'id')!
  const slug = getRouterParam(event, 'slug')!
  const sessionGroupPutSchema = z.object({
    name: z.string().min(1).optional(),
    description: z.string().optional(),
    sortOrder: z.number().optional(),
  })
  const body = await validateBody(event, sessionGroupPutSchema)
  const db = useDb()

  const group = db.select().from(sessionGroups)
    .where(and(eq(sessionGroups.campaignId, campaignId), eq(sessionGroups.slug, slug)))
    .get()
  if (!group) throw createError({ statusCode: 404, message: 'Session group not found' })

  const updates: Partial<typeof group> = { updatedAt: new Date() }
  if (body.name !== undefined) updates.name = body.name.trim()
  if (body.description !== undefined) updates.description = body.description
  if (body.sortOrder !== undefined) updates.sortOrder = body.sortOrder

  db.update(sessionGroups).set(updates).where(eq(sessionGroups.id, group.id)).run()

  return db.select().from(sessionGroups).where(eq(sessionGroups.id, group.id)).get()
})
