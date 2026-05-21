import { eq, and } from 'drizzle-orm'
import { useDb } from '../../../../../utils/db'
import { organizations } from '../../../../../db/schema'
import { hasMinRole } from '../../../../../utils/permissions'
import { deleteOrganizationWithEntity } from '../../../../../services/organizations'
import type { CampaignRole } from '../../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const role = event.context.campaignRole as CampaignRole
  if (!hasMinRole(role, 'co_dm')) {
    throw createError({ statusCode: 403, message: 'Co-DM or above can delete organizations' })
  }

  const campaignId = getRouterParam(event, 'id')!
  const slug = getRouterParam(event, 'slug')!
  const db = useDb()

  const org = db
    .select({ id: organizations.id })
    .from(organizations)
    .where(and(eq(organizations.campaignId, campaignId), eq(organizations.slug, slug)))
    .get()

  if (!org) {
    throw createError({ statusCode: 404, message: 'Organization not found' })
  }

  try {
    deleteOrganizationWithEntity(db, org.id)
  } catch (err: unknown) {
    const e = err as { statusCode?: number; message?: string }
    if (e.statusCode) throw createError({ statusCode: e.statusCode, message: e.message })
    throw err
  }

  return { success: true }
})
