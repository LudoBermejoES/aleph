import { z } from 'zod'
import { randomUUID } from 'crypto'
import { eq, and } from 'drizzle-orm'
import { useDb } from '../../../../utils/db'
import { validateBody } from '../../../../utils/validate'
import { sessionGroups } from '../../../../db/schema/sessions'
import { hasMinRole } from '../../../../utils/permissions'
import { slugify } from '../../../../services/content'
import type { CampaignRole } from '../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const role = event.context.campaignRole as CampaignRole
  if (!hasMinRole(role, 'editor')) {
    throw createError({ statusCode: 403, message: 'Editors or above can create session groups' })
  }

  const campaignId = getRouterParam(event, 'id')!
  const sessionGroupSchema = z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    sortOrder: z.number().optional(),
  })
  const body = await validateBody(event, sessionGroupSchema)

  const db = useDb()
  const slug = slugify(body.name)

  const existing = db.select({ id: sessionGroups.id }).from(sessionGroups)
    .where(and(eq(sessionGroups.campaignId, campaignId), eq(sessionGroups.slug, slug)))
    .get()
  if (existing) {
    throw createError({ statusCode: 409, message: `A group with slug "${slug}" already exists` })
  }

  const id = randomUUID()
  const now = new Date()

  db.insert(sessionGroups).values({
    id,
    campaignId,
    name: body.name.trim(),
    slug,
    description: body.description ?? null,
    sortOrder: body.sortOrder ?? 0,
    createdAt: now,
    updatedAt: now,
  }).run()

  return db.select().from(sessionGroups).where(eq(sessionGroups.id, id)).get()
})
