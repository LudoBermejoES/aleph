import { eq, and } from 'drizzle-orm'
import { useDb } from '../../../../../utils/db'
import { characterFolders } from '../../../../../db/schema/characters'
import { hasMinRole } from '../../../../../utils/permissions'
import type { CampaignRole } from '../../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const role = event.context.campaignRole as CampaignRole
  if (!hasMinRole(role, 'editor')) {
    throw createError({ statusCode: 403, message: 'Editors or above can update character folders' })
  }

  const campaignId = getRouterParam(event, 'id')!
  const folderId = getRouterParam(event, 'folderId')!
  const body = await readBody(event)
  const db = useDb()

  const folder = db.select().from(characterFolders).where(and(eq(characterFolders.campaignId, campaignId), eq(characterFolders.id, folderId))).get()
  if (!folder) throw createError({ statusCode: 404, message: 'Character folder not found' })

  const updates: Record<string, unknown> = {}
  if (body.name !== undefined) updates.name = body.name
  if (body.parentFolderId !== undefined) updates.parentFolderId = body.parentFolderId
  if (body.sortOrder !== undefined) updates.sortOrder = body.sortOrder

  if (Object.keys(updates).length > 0) {
    db.update(characterFolders).set(updates).where(eq(characterFolders.id, folder.id)).run()
  }

  return { success: true }
})
