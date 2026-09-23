import { eq, and } from 'drizzle-orm'
import { useDb } from '../../../../../utils/db'
import { arcs, chapters } from '../../../../../db/schema/sessions'
import { hasMinRole } from '../../../../../utils/permissions'
import type { CampaignRole } from '../../../../../utils/permissions'

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
  if (!hasMinRole(role, 'editor')) {
    throw createError({ statusCode: 403, message: 'Editors or above can update chapters' })
  }

  const campaignId = getRouterParam(event, 'id')!
  const slug = getRouterParam(event, 'slug')!
  const body = await readBody(event)
  refuseSubCampaignWrite(body as Record<string, unknown>)
  const db = useDb()

  // Scoped to the campaign through the arc join in the same query. Looking the slug up
  // globally first and only then checking the campaign let a same-slug chapter in another
  // campaign shadow this one and 404 a chapter that does exist here.
  const chapter = db
    .select({ id: chapters.id })
    .from(chapters)
    .innerJoin(arcs, eq(chapters.arcId, arcs.id))
    .where(and(eq(arcs.campaignId, campaignId), eq(chapters.slug, slug)))
    .get()
  if (!chapter) throw createError({ statusCode: 404, message: 'Chapter not found' })

  const updates: Record<string, unknown> = {}
  if (body.name !== undefined) updates.name = body.name
  if (body.description !== undefined) updates.description = body.description
  if (body.sortOrder !== undefined) updates.sortOrder = body.sortOrder

  if (Object.keys(updates).length > 0) {
    db.update(chapters).set(updates).where(eq(chapters.id, chapter.id)).run()
  }

  return { success: true }
})
