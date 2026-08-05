import { and, eq } from 'drizzle-orm'
import { createError } from 'h3'
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import { arcs, chapters } from '../db/schema/sessions'

/**
 * Slug-addressed arc/chapter assignment for sessions.
 *
 * Mirrors the `subCampaignSlug` convention already used by the sessions PUT/POST handlers:
 * the client sends a slug, the server resolves it against the route's campaign, and
 * `null`/`''` unsets the FK. Resolution lives here (not in each client) so the wording
 * of every error and the campaign scoping are defined exactly once.
 *
 * Deliberate divergences from the arc PUT/DELETE handlers, which use `.get()`
 * (first-row-wins) — see `openspec/changes/cli-arc-support/design.md`:
 *   - `arcs` has no unique `(campaignId, slug)` constraint and `chapters` has no
 *     `campaignId` column at all, so a slug can legitimately match several rows.
 *     Silently picking the first one would misfile a session invisibly, so an
 *     ambiguous slug is a 409 naming the slug and the match count.
 *   - Chapter lookups join `chapters -> arcs` and filter on `arcs.campaignId` from
 *     the start. A campaign-blind `chapters.slug` lookup (as in
 *     `chapters/[slug]/index.put.ts:18`) lets a same-slug chapter in another campaign
 *     shadow the right one and produce a spurious 404.
 */

export interface ArcChapterSlugInput {
  arcSlug?: string | null
  chapterSlug?: string | null
}

/** Columns to apply to `game_sessions`. A key is present only if it must change. */
export interface ArcChapterAssignment {
  arcId?: string | null
  chapterId?: string | null
}

/**
 * The session's state before this update, so a change of arc can drag an
 * inconsistent chapter with it. Omitted on create — nothing to cascade from.
 */
export interface ArcChapterCurrentState {
  chapterId?: string | null
}

const isUnset = (value: string | null | undefined) => value === null || value === ''

function resolveArcSlug(db: BetterSQLite3Database, campaignId: string, arcSlug: string) {
  const matches = db
    .select({ id: arcs.id })
    .from(arcs)
    .where(and(eq(arcs.campaignId, campaignId), eq(arcs.slug, arcSlug)))
    .all()

  if (matches.length === 0) {
    throw createError({ statusCode: 404, message: `Arc "${arcSlug}" not found` })
  }
  if (matches.length > 1) {
    throw createError({
      statusCode: 409,
      message: `Arc slug "${arcSlug}" is ambiguous: ${matches.length} arcs in this campaign share it. Rename one, or pass arcId instead.`,
    })
  }
  return matches[0]!.id
}

/**
 * All chapters of the campaign carrying `chapterSlug`, reached through their arc.
 * Never filtered by arc here: knowing whether a slug exists in the campaign but in
 * a *different* arc is what separates a 422 (wrong pair) from a 404 (no such chapter).
 */
function findCampaignChapters(db: BetterSQLite3Database, campaignId: string, chapterSlug: string) {
  return db
    .select({ id: chapters.id, arcId: chapters.arcId })
    .from(chapters)
    .innerJoin(arcs, eq(chapters.arcId, arcs.id))
    .where(and(eq(arcs.campaignId, campaignId), eq(chapters.slug, chapterSlug)))
    .all()
}

/**
 * Turn `arcSlug`/`chapterSlug` into the `arcId`/`chapterId` columns to write.
 *
 * - Neither field present -> `{}` (nothing to change).
 * - `arcSlug` unset (`null`/`''`) -> clears `arcId` **and** `chapterId`: a chapter
 *   belongs to an arc, so arc-NULL + chapter-non-NULL is a row the schema permits but
 *   the domain forbids.
 * - `chapterSlug` unset -> clears only `chapterId`, leaving the arc.
 * - `chapterSlug` alone -> sets `chapterId` and derives `arcId` from the chapter.
 * - Both present and inconsistent -> 422 naming both slugs.
 * - A non-empty `arcSlug` alone, when `current.chapterId` belongs to a *different*
 *   arc -> clears that `chapterId` too. Moving a session between arcs is an ordinary
 *   operation and the caller said nothing about the chapter, so rejecting would be
 *   wrong; leaving the chapter behind would strand it under the wrong arc. A chapter
 *   already in the target arc is left untouched.
 *
 * Throws H3 errors: 404 unresolvable, 409 ambiguous, 422 inconsistent pair.
 */
export function resolveArcChapterSlugs(
  db: BetterSQLite3Database,
  campaignId: string,
  input: ArcChapterSlugInput,
  current?: ArcChapterCurrentState,
): ArcChapterAssignment {
  const hasArc = input.arcSlug !== undefined
  const hasChapter = input.chapterSlug !== undefined
  if (!hasArc && !hasChapter) return {}

  const clearArc = hasArc && isUnset(input.arcSlug)
  const clearChapter = hasChapter && isUnset(input.chapterSlug)

  // Clearing the arc cascades to the chapter.
  if (clearArc) {
    if (hasChapter && !clearChapter) {
      throw createError({
        statusCode: 422,
        message: `Cannot assign chapter "${input.chapterSlug}" while clearing the arc: a chapter always belongs to an arc.`,
      })
    }
    return { arcId: null, chapterId: null }
  }

  const arcId = hasArc ? resolveArcSlug(db, campaignId, input.arcSlug as string) : undefined

  // Arc changed and the caller said nothing about the chapter: a chapter left over from
  // the old arc would contradict the new one, so it goes. One already in the target arc
  // stays.
  if (!hasChapter) {
    if (arcId !== undefined && current?.chapterId) {
      const held = db
        .select({ arcId: chapters.arcId })
        .from(chapters)
        .where(eq(chapters.id, current.chapterId))
        .get()
      if (held && held.arcId !== arcId) return { arcId, chapterId: null }
    }
    return { arcId }
  }
  if (clearChapter) return arcId === undefined ? { chapterId: null } : { arcId, chapterId: null }

  const chapterSlug = input.chapterSlug as string
  const candidates = findCampaignChapters(db, campaignId, chapterSlug)
  if (candidates.length === 0) {
    throw createError({ statusCode: 404, message: `Chapter "${chapterSlug}" not found` })
  }

  // `arcSlug` narrows an otherwise ambiguous chapter slug — and disagreement is an error.
  const scoped = arcId === undefined ? candidates : candidates.filter((c) => c.arcId === arcId)
  if (scoped.length === 0) {
    throw createError({
      statusCode: 422,
      message: `Chapter "${chapterSlug}" does not belong to arc "${input.arcSlug}"`,
    })
  }
  if (scoped.length > 1) {
    throw createError({
      statusCode: 409,
      message:
        arcId === undefined
          ? `Chapter slug "${chapterSlug}" is ambiguous: ${scoped.length} chapters in this campaign share it. Pass arcSlug to disambiguate, or chapterId instead.`
          : `Chapter slug "${chapterSlug}" is ambiguous: ${scoped.length} chapters in arc "${input.arcSlug}" share it. Pass chapterId instead.`,
    })
  }

  const chapter = scoped[0]!
  return { arcId: chapter.arcId, chapterId: chapter.id }
}
