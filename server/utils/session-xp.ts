import { z } from 'zod'
import { eq, asc } from 'drizzle-orm'
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import { sessionCharacterXp } from '../db/schema/sessions'
import { characters } from '../db/schema/characters'
import { entities } from '../db/schema/entities'

/**
 * Shared shape for writing a session's per-character XP awards. Kept in one place so the
 * endpoint and its tests agree on what a legal request looks like — see
 * `openspec/changes/add-per-character-session-xp/design.md` for the decisions this encodes:
 *
 * - XP belongs to a CHARACTER, so the key of an award is `characterId`, never a user id.
 * - Integer, never fractional (M20-style XP is always whole numbers).
 * - Never negative: XP penalties are a different, unbuilt feature.
 * - `0` is legal and meaningful. "Recorded, awarded nothing" is a real outcome; "not recorded"
 *   is expressed by the award simply not being in the list (decision 2 — row presence is the
 *   record), so this schema needs no nullable value and has none.
 * - The list is the WHOLE truth for that session (decision 5): the endpoint replaces rather than
 *   merges, and an empty array therefore clears every award. That is why `awards` is required
 *   and not `.optional()` — an omitted key would be indistinguishable from "change nothing",
 *   and a request that is accepted while doing nothing is the exact failure mode this repo keeps
 *   running into.
 *
 * `strictObject` on both levels is deliberate. zod's default is to DISCARD unknown keys and
 * report success, so a client sending `character_id` (or `{ characterId, xp, note }`) would pass
 * validation while the server wrote something other than what was sent. Here an unknown key is a
 * 422 the caller can see, and `parse(body)` deep-equals `body` for every body that passes.
 */
export const sessionXpAwardSchema = z.strictObject({
  characterId: z.string().min(1),
  xp: z.number().int().nonnegative(),
})

export const sessionXpAwardsSchema = z
  .strictObject({
    awards: z.array(sessionXpAwardSchema),
  })
  .superRefine((value, ctx) => {
    // One character, one award. Two rows for the same character would make the request's own
    // meaning ambiguous (which value wins?) and would collide with the table's unique index
    // anyway — better a 422 that names the character than a 500 from the database.
    const seen = new Set<string>()
    value.awards.forEach((award, index) => {
      if (seen.has(award.characterId)) {
        ctx.addIssue({
          code: 'custom',
          path: ['awards', index, 'characterId'],
          message: `Duplicate award for character ${award.characterId}`,
        })
      }
      seen.add(award.characterId)
    })
  })

export type SessionXpAward = z.infer<typeof sessionXpAwardSchema>
export type SessionXpAwardsInput = z.infer<typeof sessionXpAwardsSchema>

export interface SessionXpAwardView {
  characterId: string
  characterName: string
  characterSlug: string
  xp: number
}

/**
 * The session's awards, enriched with the character's display name and slug.
 *
 * Lives here rather than in either endpoint so the `GET` that reads a session and the `PUT` that
 * writes its awards cannot disagree about the shape they hand back — a client that saves and
 * then re-reads must see the same objects, not two dialects of the same idea.
 */
export function listSessionXpAwards(
  db: BetterSQLite3Database,
  sessionId: string,
): SessionXpAwardView[] {
  return db
    .select({
      characterId: sessionCharacterXp.characterId,
      characterName: entities.name,
      characterSlug: entities.slug,
      xp: sessionCharacterXp.xp,
    })
    .from(sessionCharacterXp)
    .innerJoin(characters, eq(sessionCharacterXp.characterId, characters.id))
    .innerJoin(entities, eq(characters.entityId, entities.id))
    .where(eq(sessionCharacterXp.sessionId, sessionId))
    .orderBy(asc(entities.name))
    .all()
}
