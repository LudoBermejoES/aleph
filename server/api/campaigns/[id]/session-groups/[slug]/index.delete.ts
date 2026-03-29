import { eq, and } from 'drizzle-orm'
import { useDb } from '../../../../../utils/db'
import { sessionGroups } from '../../../../../db/schema/sessions'
import { gameSessions } from '../../../../../db/schema/sessions'
import { hasMinRole } from '../../../../../utils/permissions'
import type { CampaignRole } from '../../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const role = event.context.campaignRole as CampaignRole
  if (!hasMinRole(role, 'co_dm')) {
    throw createError({ statusCode: 403, message: 'Co-DM or above can delete session groups' })
  }

  const campaignId = getRouterParam(event, 'id')!
  const slug = getRouterParam(event, 'slug')!
  const db = useDb()

  const group = db.select({ id: sessionGroups.id }).from(sessionGroups)
    .where(and(eq(sessionGroups.campaignId, campaignId), eq(sessionGroups.slug, slug)))
    .get()
  if (!group) throw createError({ statusCode: 404, message: 'Session group not found' })

  // Unassign sessions from this group before deleting (SQLite doesn't auto-null FKs)
  db.update(gameSessions).set({ groupId: null }).where(eq(gameSessions.groupId, group.id)).run()

  db.delete(sessionGroups).where(eq(sessionGroups.id, group.id)).run()

  return { success: true }
})
