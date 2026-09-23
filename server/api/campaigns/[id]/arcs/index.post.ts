import { z } from 'zod'
import { randomUUID } from 'crypto'
import { eq } from 'drizzle-orm'
import { useDb, useSqlite } from '../../../../utils/db'
import { validateBody } from '../../../../utils/validate'
import { arcs, subCampaigns } from '../../../../db/schema/sessions'
import { entities } from '../../../../db/schema/entities'
import { hasMinRole } from '../../../../utils/permissions'
import { ensureUniqueSlug } from '../../../../utils/content-helpers'
import { resolveSubCampaignIdForCreate } from '../../../../utils/sub-campaign'
import { indexEntity } from '../../../../services/search'
import { indexEntityEmbedding } from '../../../../services/embeddings'
import type { CampaignRole } from '../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const role = event.context.campaignRole as CampaignRole
  if (!hasMinRole(role, 'co_dm')) {
    throw createError({ statusCode: 403, message: 'Co-DM or above can create arcs' })
  }

  const campaignId = getRouterParam(event, 'id')!
  const arcSchema = z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    sortOrder: z.number().optional(),
    status: z.string().optional(),
    subCampaignSlug: z.string().optional(),
  })
  const body = await validateBody(event, arcSchema)
  const db = useDb()

  const subCampaignId = resolveSubCampaignIdForCreate(db, campaignId, body.subCampaignSlug)

  // Shared by both rows: arcs.id doubles as entities.id (same shared-id pattern
  // organizations/quests/sessions already use), and one campaign-wide unique slug backs both.
  const id = randomUUID()
  const slug = ensureUniqueSlug(db, campaignId, body.name)
  const now = new Date()

  db.insert(entities)
    .values({
      id,
      campaignId,
      type: 'arc',
      name: body.name,
      slug,
      // Arcs have no backing .md file, no createdAt/updatedAt of their own — see design.md.
      filePath: '',
      visibility: 'members',
      createdBy: event.context.user.id,
      createdAt: now,
      updatedAt: now,
    })
    .run()

  db.insert(arcs)
    .values({
      id,
      campaignId,
      subCampaignId,
      name: body.name,
      slug,
      description: body.description || null,
      sortOrder: body.sortOrder || 0,
      status: body.status || 'planned',
    })
    .run()

  const sqlite = useSqlite()
  indexEntity(sqlite, id, campaignId, body.name, [], [], body.description || '')
  await indexEntityEmbedding(sqlite, id, campaignId, body.name, body.description || '')

  // `slug` is what every other arc endpoint is addressed by, so the caller needs it
  // straight away — without it a client can only print `(undefined)` and must re-list.
  // The sub-campaign rides along for the same reason: it may have come from the campaign
  // default rather than from the request, so echoing it is the only way a caller learns
  // where the arc actually landed without a second round trip.
  const sub = db
    .select({ name: subCampaigns.name, slug: subCampaigns.slug })
    .from(subCampaigns)
    .where(eq(subCampaigns.id, subCampaignId))
    .get()
  return {
    id,
    name: body.name,
    slug,
    subCampaignId,
    subCampaignName: sub?.name,
    subCampaignSlug: sub?.slug,
  }
})
