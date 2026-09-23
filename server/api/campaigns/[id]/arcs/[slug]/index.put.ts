import { z } from 'zod'
import { eq, and } from 'drizzle-orm'
import { useDb, useSqlite } from '../../../../../utils/db'
import { validateBody } from '../../../../../utils/validate'
import { arcs, gameSessions } from '../../../../../db/schema/sessions'
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
  // Was a bare `readBody`, the only one of the three (arcs/quests/sessions) without a schema, so
  // a `subCampaignSlug: 123` reached the query unvalidated.
  const arcPutSchema = z.object({
    name: z.string().min(1).optional(),
    description: z.string().nullable().optional(),
    sortOrder: z.number().optional(),
    status: z.string().optional(),
    subCampaignSlug: z.string().optional(),
  })
  const body = await validateBody(event, arcPutSchema)
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

  // Sessions follow their arc. The arc is the organizing unit and its sessions are part of the
  // storyline it names; leaving them behind is what manufactured the incoherence the 422 now
  // refuses, one arc move at a time and invisibly. The count goes back in the response so a
  // single edit rewriting many rows is never silent.
  const movesSubCampaign =
    updates.subCampaignId !== undefined && updates.subCampaignId !== arc.subCampaignId
  let movedSessions = 0

  if (Object.keys(updates).length > 0) {
    db.transaction((tx) => {
      tx.update(arcs).set(updates).where(eq(arcs.id, arc.id)).run()
      if (movesSubCampaign) {
        const affected = tx
          .select({ id: gameSessions.id })
          .from(gameSessions)
          .where(eq(gameSessions.arcId, arc.id))
          .all()
        movedSessions = affected.length
        if (movedSessions > 0) {
          tx.update(gameSessions)
            .set({ subCampaignId: updates.subCampaignId as string, updatedAt: new Date() })
            .where(eq(gameSessions.arcId, arc.id))
            .run()
        }
      }
    })
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

  // Chapters need no reassignment: their sub-campaign is derived from this arc.
  return { success: true, movedSessions }
})
