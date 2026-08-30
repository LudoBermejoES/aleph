import { eq, and } from 'drizzle-orm'
import { useDb } from '../../../../../../utils/db'
import { withApiHandler } from '../../../../../../utils/api-handler'
import { gameSessions, sessionCharacterXp } from '../../../../../../db/schema/sessions'
import { hasMinRole } from '../../../../../../utils/permissions'
import type { CampaignRole } from '../../../../../../utils/permissions'

/**
 * Clear ONE character's award for a session.
 *
 * The whole-list `PUT` could express this by restating everything else, but the CLI needs to
 * remove a single award without first knowing the rest — the shape that made `--clear` usable.
 *
 * `204` when a row was removed, `404` when there was nothing to remove: row presence IS the
 * record (design decision 2), so "cleared" and "there was nothing there" are genuinely different
 * answers and the caller is told which one it got.
 */
export default defineEventHandler((event) =>
  withApiHandler(event, async () => {
    const role = event.context.campaignRole as CampaignRole
    if (!hasMinRole(role, 'co_dm')) {
      throw createError({ statusCode: 403, message: 'Only DM or co-DM can record XP' })
    }

    const campaignId = getRouterParam(event, 'id')!
    const slug = getRouterParam(event, 'slug')!
    const characterId = getRouterParam(event, 'characterId')!
    const db = useDb()

    const session = db
      .select()
      .from(gameSessions)
      .where(and(eq(gameSessions.campaignId, campaignId), eq(gameSessions.slug, slug)))
      .get()
    if (!session) throw createError({ statusCode: 404, message: 'Session not found' })

    const existing = db
      .select({ id: sessionCharacterXp.id })
      .from(sessionCharacterXp)
      .where(
        and(
          eq(sessionCharacterXp.sessionId, session.id),
          eq(sessionCharacterXp.characterId, characterId),
        ),
      )
      .get()
    if (!existing) {
      throw createError({ statusCode: 404, message: 'No XP recorded for that character' })
    }

    db.delete(sessionCharacterXp).where(eq(sessionCharacterXp.id, existing.id)).run()

    setResponseStatus(event, 204)
    return null
  }),
)
