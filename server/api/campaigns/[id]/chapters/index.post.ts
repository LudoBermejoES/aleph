import { z } from 'zod'
import { and, eq } from 'drizzle-orm'
import { randomUUID } from 'crypto'
import { useDb } from '../../../../utils/db'
import { validateBody } from '../../../../utils/validate'
import { arcs, chapters } from '../../../../db/schema/sessions'
import { hasMinRole } from '../../../../utils/permissions'
import { slugify } from '../../../../services/content'
import type { CampaignRole } from '../../../../utils/permissions'

/**
 * A chapter's sub-campaign is derived from its arc and cannot be written here.
 *
 * REFUSED rather than stripped by zod: an unknown key silently discarded is the "accepted and
 * does nothing" shape this codebase keeps paying for — the caller believes it moved the chapter.
 * The message names the real route.
 */
function refuseSubCampaignWrite(body: Record<string, unknown>): void {
  if (body.subCampaignSlug === undefined && body.subCampaignId === undefined) return
  throw createError({
    statusCode: 422,
    message:
      "A chapter's sub-campaign is derived from its arc and cannot be set directly. " +
      'Move the arc instead (PUT /arcs/:slug with subCampaignSlug), and its chapters follow.',
  })
}

export default defineEventHandler(async (event) => {
  const role = event.context.campaignRole as CampaignRole
  if (!hasMinRole(role, 'co_dm')) {
    throw createError({ statusCode: 403, message: 'Co-DM or above can create chapters' })
  }

  const chapterSchema = z.object({
    name: z.string().min(1),
    arcId: z.string(),
    description: z.string().optional(),
    sortOrder: z.number().optional(),
  })
  refuseSubCampaignWrite((await readBody(event)) as Record<string, unknown>)
  const body = await validateBody(event, chapterSchema)

  const db = useDb()
  const campaignId = getRouterParam(event, 'id')!

  // The arc must belong to the route's campaign. Without this the endpoint happily attaches a
  // chapter to another campaign's arc, which then shows up in that campaign's chapter list.
  const arc = db
    .select({ id: arcs.id })
    .from(arcs)
    .where(and(eq(arcs.id, body.arcId), eq(arcs.campaignId, campaignId)))
    .get()
  if (!arc) {
    throw createError({
      statusCode: 404,
      message: `Arc "${body.arcId}" not found in this campaign`,
    })
  }
  const id = randomUUID()
  const slug = slugify(body.name)

  db.insert(chapters)
    .values({
      id,
      arcId: body.arcId,
      name: body.name,
      slug,
      description: body.description || null,
      sortOrder: body.sortOrder || 0,
    })
    .run()

  // Same as arcs: chapter update/delete are slug-addressed, so return the slug.
  return { id, name: body.name, slug, arcId: body.arcId }
})
