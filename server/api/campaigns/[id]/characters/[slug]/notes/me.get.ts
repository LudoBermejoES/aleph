import { eq, and } from 'drizzle-orm'
import { useDb } from '../../../../../../utils/db'
import { characterNotes } from '../../../../../../db/schema/characters'
import { resolveReadableCharacter } from '../../../../../../services/characters'
import type { CampaignRole } from '../../../../../../utils/permissions'
import { withApiHandler } from '../../../../../../utils/api-handler'

/**
 * GET the authenticated caller's own note on a character.
 *
 * The route is `/notes/me`, never `/notes/:userId`: there is no route shape that could be
 * pointed at another member's note, so "read someone else's note" is not a permission that
 * can be got wrong. Every note is visible anyway through the character read payload.
 *
 * A caller who has never annotated the character gets `200` with `note: null`, not `404` —
 * `404` here would be indistinguishable from "the character is not visible to you".
 */
export default defineEventHandler((event) =>
  withApiHandler(event, async () => {
    const campaignId = getRouterParam(event, 'id')!
    const slug = getRouterParam(event, 'slug')!
    const role = event.context.campaignRole as CampaignRole
    const userId = event.context.user?.id || ''
    const db = useDb()

    // 404 when the caller cannot read the character — same response as reading it
    const { character } = await resolveReadableCharacter(db, campaignId, slug, userId, role)

    const note =
      db
        .select({
          id: characterNotes.id,
          authorUserId: characterNotes.authorUserId,
          body: characterNotes.body,
          createdAt: characterNotes.createdAt,
          updatedAt: characterNotes.updatedAt,
        })
        .from(characterNotes)
        .where(
          and(
            eq(characterNotes.characterId, character.id),
            eq(characterNotes.authorUserId, userId),
          ),
        )
        .get() ?? null

    return { note }
  }),
)
