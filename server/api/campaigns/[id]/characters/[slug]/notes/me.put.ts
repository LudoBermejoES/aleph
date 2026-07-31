import { z } from 'zod'
import { randomUUID } from 'crypto'
import { eq, and } from 'drizzle-orm'
import { useDb } from '../../../../../../utils/db'
import { validateBody } from '../../../../../../utils/validate'
import { characterNotes } from '../../../../../../db/schema/characters'
import {
  canAnnotateCharacter,
  normalizeNoteBody,
  resolveReadableCharacter,
} from '../../../../../../services/characters'
import type { CampaignRole } from '../../../../../../utils/permissions'
import { withApiHandler } from '../../../../../../utils/api-handler'

/**
 * The security boundary for public notes.
 *
 * The schema is EXACTLY `{ body: string }`. It never reads the character update schema, so a
 * hand-crafted payload carrying `ownerUserId`, `visibility` or `fields` cannot reach the
 * character row through this route — zod drops the extra keys and only `body` is applied.
 * The restricted editor in the UI omitting those inputs is a convenience, not the boundary;
 * `PUT /characters/:slug` keeps its own `403` untouched.
 */
const noteSchema = z.object({ body: z.string() })

export default defineEventHandler((event) =>
  withApiHandler(event, async () => {
    const campaignId = getRouterParam(event, 'id')!
    const slug = getRouterParam(event, 'slug')!
    const role = event.context.campaignRole as CampaignRole
    const userId = event.context.user.id
    const body = await validateBody(event, noteSchema)
    const db = useDb()

    // 404 first, so an unreadable character never reveals itself through a 403
    const { character } = await resolveReadableCharacter(db, campaignId, slug, userId, role)

    if (!canAnnotateCharacter(role)) {
      throw createError({ statusCode: 403, message: 'Visitors cannot add notes' })
    }

    const normalized = normalizeNoteBody(body.body)
    const now = new Date()

    const existing = db
      .select()
      .from(characterNotes)
      .where(
        and(eq(characterNotes.characterId, character.id), eq(characterNotes.authorUserId, userId)),
      )
      .get()

    // Empty or whitespace-only body means "no note": delete the row rather than store a blank,
    // so the character page never renders an empty attributed block.
    if (normalized === null) {
      if (existing) {
        db.delete(characterNotes).where(eq(characterNotes.id, existing.id)).run()
      }
      return { note: null, deleted: !!existing }
    }

    if (existing) {
      db.update(characterNotes)
        .set({ body: normalized, updatedAt: now })
        .where(eq(characterNotes.id, existing.id))
        .run()
      return {
        note: {
          id: existing.id,
          authorUserId: userId,
          body: normalized,
          createdAt: existing.createdAt,
          updatedAt: now,
        },
        deleted: false,
      }
    }

    const id = randomUUID()
    db.insert(characterNotes)
      .values({
        id,
        characterId: character.id,
        authorUserId: userId,
        body: normalized,
        createdAt: now,
        updatedAt: now,
      })
      .run()

    return {
      note: { id, authorUserId: userId, body: normalized, createdAt: now, updatedAt: now },
      deleted: false,
    }
  }),
)
