import { z } from 'zod'
import { randomUUID } from 'crypto'
import { eq, and } from 'drizzle-orm'
import { useDb } from '../../../../../../utils/db'
import { validateBody } from '../../../../../../utils/validate'
import { withApiHandler } from '../../../../../../utils/api-handler'
import { gameSessions, sessionAttendance } from '../../../../../../db/schema/sessions'
import { campaignMembers } from '../../../../../../db/schema/campaign-members'
import { characters } from '../../../../../../db/schema/characters'
import { entities } from '../../../../../../db/schema/entities'
import { hasMinRole } from '../../../../../../utils/permissions'
import type { CampaignRole } from '../../../../../../utils/permissions'

export default defineEventHandler((event) =>
  withApiHandler(event, async () => {
    const role = event.context.campaignRole as CampaignRole
    if (!hasMinRole(role, 'co_dm')) {
      throw createError({ statusCode: 403, message: 'Only DM or co-DM can add participants' })
    }

    const campaignId = getRouterParam(event, 'id')!
    const slug = getRouterParam(event, 'slug')!
    const db = useDb()

    const bodySchema = z.object({
      userId: z.string().min(1),
      characterId: z.string().optional(),
      rsvpStatus: z.enum(['pending', 'accepted', 'declined', 'tentative']).optional(),
    })
    const body = await validateBody(event, bodySchema)

    // Resolve session
    const session = db
      .select()
      .from(gameSessions)
      .where(and(eq(gameSessions.campaignId, campaignId), eq(gameSessions.slug, slug)))
      .get()
    if (!session) throw createError({ statusCode: 404, message: 'Session not found' })

    // Verify userId is a campaign member
    const member = db
      .select()
      .from(campaignMembers)
      .where(
        and(eq(campaignMembers.campaignId, campaignId), eq(campaignMembers.userId, body.userId)),
      )
      .get()
    if (!member) throw createError({ statusCode: 404, message: 'User is not a campaign member' })

    // If characterId supplied, verify it belongs to this campaign
    if (body.characterId) {
      const charEntity = db
        .select()
        .from(characters)
        .innerJoin(entities, eq(characters.entityId, entities.id))
        .where(and(eq(characters.id, body.characterId), eq(entities.campaignId, campaignId)))
        .get()
      if (!charEntity) {
        throw createError({
          statusCode: 422,
          message: 'Character does not belong to this campaign',
        })
      }
    }

    // Upsert attendance row
    const existing = db
      .select()
      .from(sessionAttendance)
      .where(
        and(eq(sessionAttendance.sessionId, session.id), eq(sessionAttendance.userId, body.userId)),
      )
      .get()

    if (existing) {
      const updates: Record<string, unknown> = {}
      if (body.characterId !== undefined) updates.characterId = body.characterId
      if (body.rsvpStatus !== undefined) updates.rsvpStatus = body.rsvpStatus
      if (Object.keys(updates).length > 0) {
        db.update(sessionAttendance).set(updates).where(eq(sessionAttendance.id, existing.id)).run()
      }
    } else {
      db.insert(sessionAttendance)
        .values({
          id: randomUUID(),
          sessionId: session.id,
          userId: body.userId,
          characterId: body.characterId || null,
          rsvpStatus: body.rsvpStatus || 'pending',
          attended: false,
        })
        .run()
    }

    return { success: true }
  }),
)
