import { eq, and, ne } from 'drizzle-orm'
import { useDb } from '../../../../../utils/db'
import { organizations } from '../../../../../db/schema'
import { hasMinRole } from '../../../../../utils/permissions'
import { slugify } from '../../../../../services/content'
import type { CampaignRole } from '../../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const role = event.context.campaignRole as CampaignRole
  if (!hasMinRole(role, 'editor')) {
    throw createError({ statusCode: 403, message: 'Editors or above can update organizations' })
  }

  const campaignId = getRouterParam(event, 'id')!
  const slug = getRouterParam(event, 'slug')!
  const db = useDb()

  const org = db.select()
    .from(organizations)
    .where(and(eq(organizations.campaignId, campaignId), eq(organizations.slug, slug)))
    .get()

  if (!org) {
    throw createError({ statusCode: 404, message: 'Organization not found' })
  }

  const body = await readBody(event)
  const { name, description, type, status } = body

  let newSlug = org.slug
  if (name && name.trim() !== org.name) {
    newSlug = slugify(name)
    const collision = db.select({ id: organizations.id })
      .from(organizations)
      .where(and(
        eq(organizations.campaignId, campaignId),
        eq(organizations.slug, newSlug),
        ne(organizations.id, org.id),
      ))
      .get()
    if (collision) {
      throw createError({ statusCode: 409, message: 'An organization with this name already exists in this campaign' })
    }
  }

  db.update(organizations)
    .set({
      name: name?.trim() ?? org.name,
      slug: newSlug,
      description: description !== undefined ? description : org.description,
      type: type ?? org.type,
      status: status ?? org.status,
      updatedAt: new Date(),
    })
    .where(eq(organizations.id, org.id))
    .run()

  return db.select().from(organizations).where(eq(organizations.id, org.id)).get()
})
