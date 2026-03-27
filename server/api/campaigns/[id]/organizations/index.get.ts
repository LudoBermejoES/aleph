import { eq, sql } from 'drizzle-orm'
import { useDb } from '../../../../utils/db'
import { organizations, organizationMembers } from '../../../../db/schema'

export default defineEventHandler(async (event) => {
  const campaignId = getRouterParam(event, 'id')!
  const db = useDb()

  const rows = db.select({
    id: organizations.id,
    name: organizations.name,
    slug: organizations.slug,
    description: organizations.description,
    type: organizations.type,
    status: organizations.status,
    createdAt: organizations.createdAt,
    updatedAt: organizations.updatedAt,
    memberCount: sql<number>`(SELECT COUNT(*) FROM organization_members WHERE organization_id = ${organizations.id})`,
  })
    .from(organizations)
    .where(eq(organizations.campaignId, campaignId))
    .all()

  return rows
})
