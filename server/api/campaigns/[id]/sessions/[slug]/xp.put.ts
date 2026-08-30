import { randomUUID } from 'crypto'
import { eq, and, inArray } from 'drizzle-orm'
import { useDb } from '../../../../../utils/db'
import { validateBody } from '../../../../../utils/validate'
import { withApiHandler } from '../../../../../utils/api-handler'
import { sessionXpAwardsSchema, listSessionXpAwards } from '../../../../../utils/session-xp'
import { gameSessions, sessionCharacterXp } from '../../../../../db/schema/sessions'
import { characters } from '../../../../../db/schema/characters'
import { entities } from '../../../../../db/schema/entities'
import { hasMinRole } from '../../../../../utils/permissions'
import type { CampaignRole } from '../../../../../utils/permissions'

/**
 * Record how much XP each character earned for a session.
 *
 * This REPLACES the session's whole award set (design decision 5): a character present in
 * `awards` is recorded at that value, a character previously recorded and absent from `awards`
 * loses its award, and `awards: []` clears the session. End-of-session XP is entered as a batch,
 * so the whole-list write makes the UI's Save button one atomic call with no partial-failure
 * state to reconcile — at the cost of one sharp edge, which is exactly why the spec spells it
 * out and why the CLI's single-character form is a read-modify-write instead of a bare `PUT`.
 *
 * The only validation beyond the body's shape is campaign membership (decision 4). There is
 * deliberately NO attendance gate: a character can legitimately earn XP for a session their
 * player attended under a different character, for downtime, or for off-screen action the DM is
 * settling up. Steering the DM toward the roster is the panel's job, not the schema's.
 */
export default defineEventHandler((event) =>
  withApiHandler(event, async () => {
    const role = event.context.campaignRole as CampaignRole
    if (!hasMinRole(role, 'co_dm')) {
      throw createError({ statusCode: 403, message: 'Only DM or co-DM can record XP' })
    }

    const campaignId = getRouterParam(event, 'id')!
    const slug = getRouterParam(event, 'slug')!
    const db = useDb()

    const session = db
      .select()
      .from(gameSessions)
      .where(and(eq(gameSessions.campaignId, campaignId), eq(gameSessions.slug, slug)))
      .get()
    if (!session) throw createError({ statusCode: 404, message: 'Session not found' })

    const body = await validateBody(event, sessionXpAwardsSchema)
    const requestedIds = body.awards.map((a) => a.characterId)

    // Every character must belong to THIS campaign. A character's campaign lives on its entity
    // row, so the membership test is the join — checking `characters` alone would happily accept
    // a character from any other campaign in the database.
    const known =
      requestedIds.length > 0
        ? db
            .select({ id: characters.id })
            .from(characters)
            .innerJoin(entities, eq(characters.entityId, entities.id))
            .where(and(eq(entities.campaignId, campaignId), inArray(characters.id, requestedIds)))
            .all()
        : []
    const knownIds = new Set(known.map((c) => c.id))
    const foreign = requestedIds.filter((id) => !knownIds.has(id))
    if (foreign.length > 0) {
      throw createError({
        statusCode: 422,
        message: `Not a character of this campaign: ${foreign.join(', ')}`,
      })
    }

    // One transaction, so a rejected body can never leave half a list behind: the clear and the
    // rewrite either both happen or neither does.
    db.transaction((tx) => {
      tx.delete(sessionCharacterXp).where(eq(sessionCharacterXp.sessionId, session.id)).run()
      for (const award of body.awards) {
        tx.insert(sessionCharacterXp)
          .values({
            id: randomUUID(),
            sessionId: session.id,
            characterId: award.characterId,
            xp: award.xp,
          })
          .run()
      }
    })

    // Read back what was written rather than echoing the request: the response is then evidence
    // of the stored state, not of the caller's intent.
    return { success: true, xpAwards: listSessionXpAwards(db, session.id) }
  }),
)
