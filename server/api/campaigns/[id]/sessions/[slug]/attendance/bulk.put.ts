import { z } from 'zod'
import { randomUUID } from 'crypto'
import { eq, and, inArray } from 'drizzle-orm'
import { useDb } from '../../../../../../utils/db'
import { validateBody } from '../../../../../../utils/validate'
import { gameSessions, sessionAttendance } from '../../../../../../db/schema/sessions'
import { entities } from '../../../../../../db/schema/entities'
import { characters } from '../../../../../../db/schema/characters'
import type { CampaignRole } from '../../../../../../utils/permissions'
import { hasMinRole } from '../../../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const campaignId = getRouterParam(event, 'id')!
  const slug = getRouterParam(event, 'slug')!
  const role = event.context.campaignRole as CampaignRole

  if (!hasMinRole(role, 'co_dm')) {
    throw createError({ statusCode: 403, message: 'Only DM or co-DM can set bulk attendance' })
  }

  const bodySchema = z.object({
    attendees: z.array(z.string()).min(1),
    attended: z.boolean().optional().default(true),
  })
  const body = await validateBody(event, bodySchema)
  const db = useDb()

  const session = db
    .select()
    .from(gameSessions)
    .where(and(eq(gameSessions.campaignId, campaignId), eq(gameSessions.slug, slug)))
    .get()
  if (!session) throw createError({ statusCode: 404, message: 'Session not found' })

  // Resolve character slugs → { characterId, ownerUserId }
  const entityRows = db
    .select({ id: entities.id, slug: entities.slug })
    .from(entities)
    .where(and(eq(entities.campaignId, campaignId), inArray(entities.slug, body.attendees)))
    .all()

  const entityIds = entityRows.map((e) => e.id)
  const characterRows =
    entityIds.length > 0
      ? db
          .select({
            id: characters.id,
            entityId: characters.entityId,
            ownerUserId: characters.ownerUserId,
          })
          .from(characters)
          .where(inArray(characters.entityId, entityIds))
          .all()
      : []

  // Build map: entityId → character info
  const charByEntityId = new Map(characterRows.map((c) => [c.entityId, c]))
  const entityBySlug = new Map(entityRows.map((e) => [e.slug, e]))

  const unresolved: string[] = []
  let updated = 0

  for (const charSlug of body.attendees) {
    const entity = entityBySlug.get(charSlug)
    const character = entity ? charByEntityId.get(entity.id) : undefined

    if (!character || !character.ownerUserId) {
      unresolved.push(charSlug)
      continue
    }

    const existing = db
      .select()
      .from(sessionAttendance)
      .where(
        and(
          eq(sessionAttendance.sessionId, session.id),
          eq(sessionAttendance.userId, character.ownerUserId),
        ),
      )
      .get()

    if (existing) {
      db.update(sessionAttendance)
        .set({ attended: body.attended, characterId: character.id })
        .where(eq(sessionAttendance.id, existing.id))
        .run()
    } else {
      db.insert(sessionAttendance)
        .values({
          id: randomUUID(),
          sessionId: session.id,
          userId: character.ownerUserId,
          characterId: character.id,
          rsvpStatus: 'accepted',
          attended: body.attended,
        })
        .run()
    }

    updated++
  }

  return { updated, unresolved }
})
