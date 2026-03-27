import { randomUUID } from 'crypto'
import { eq, and } from 'drizzle-orm'
import { useDb } from '../../../../utils/db'
import { organizations } from '../../../../db/schema'
import { hasMinRole } from '../../../../utils/permissions'
import { slugify } from '../../../../services/content'
import type { CampaignRole } from '../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const role = event.context.campaignRole as CampaignRole
  if (!hasMinRole(role, 'editor')) {
    throw createError({ statusCode: 403, message: 'Editors or above can create organizations' })
  }

  const body = await readBody(event)
  const { name, description, type, status } = body

  if (!name?.trim()) {
    throw createError({ statusCode: 400, message: 'Name is required' })
  }

  const db = useDb()
  const campaignId = getRouterParam(event, 'id')!
  const now = new Date()

  let slug = slugify(name)
  const existing = db.select({ id: organizations.id })
    .from(organizations)
    .where(and(eq(organizations.campaignId, campaignId), eq(organizations.slug, slug)))
    .get()
  if (existing) {
    throw createError({ statusCode: 409, message: 'An organization with this name already exists in this campaign' })
  }

  const id = randomUUID()
  db.insert(organizations).values({
    id,
    campaignId,
    name: name.trim(),
    slug,
    description: description || null,
    type: type || 'faction',
    status: status || 'active',
    createdAt: now,
    updatedAt: now,
  }).run()

  return db.select().from(organizations).where(eq(organizations.id, id)).get()
})
