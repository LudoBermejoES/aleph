import { eq, and } from 'drizzle-orm'
import { useDb, useSqlite } from '../../../../../utils/db'
import { arcs } from '../../../../../db/schema/sessions'
import { entities } from '../../../../../db/schema/entities'
import { hasMinRole } from '../../../../../utils/permissions'
import { resolveSubCampaignSlug } from '../../../../../utils/sub-campaign'
import { indexEntity } from '../../../../../services/search'
import { indexEntityEmbedding } from '../../../../../services/embeddings'
import type { CampaignRole } from '../../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const role = event.context.campaignRole as CampaignRole
  if (!hasMinRole(role, 'editor')) {
    throw createError({ statusCode: 403, message: 'Editors or above can update arcs' })
  }

  const campaignId = getRouterParam(event, 'id')!
  const slug = getRouterParam(event, 'slug')!
  const body = await readBody(event)
  const db = useDb()

  const arc = db
    .select()
    .from(arcs)
    .where(and(eq(arcs.campaignId, campaignId), eq(arcs.slug, slug)))
    .get()
  if (!arc) throw createError({ statusCode: 404, message: 'Arc not found' })

  const updates: Record<string, unknown> = {}
  if (body.name !== undefined) updates.name = body.name
  if (body.description !== undefined) updates.description = body.description
  if (body.sortOrder !== undefined) updates.sortOrder = body.sortOrder
  if (body.status !== undefined) updates.status = body.status
  if (body.subCampaignSlug !== undefined) {
    updates.subCampaignId = resolveSubCampaignSlug(db, campaignId, body.subCampaignSlug)
  }

  if (Object.keys(updates).length > 0) {
    db.update(arcs).set(updates).where(eq(arcs.id, arc.id)).run()
  }

  // Keep the mirror entity (arcs.id === entities.id) in sync: name is the only field the
  // relation graph / entity lookup surface.
  if (body.name !== undefined) {
    db.update(entities)
      .set({ name: body.name, updatedAt: new Date() })
      .where(eq(entities.id, arc.id))
      .run()
  }

  const finalName = body.name !== undefined ? body.name : arc.name
  const finalDescription = body.description !== undefined ? body.description : arc.description
  const sqlite = useSqlite()
  indexEntity(sqlite, arc.id, campaignId, finalName, [], [], finalDescription || '')
  await indexEntityEmbedding(sqlite, arc.id, campaignId, finalName, finalDescription || '')

  return { success: true }
})
