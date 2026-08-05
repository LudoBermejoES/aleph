import {
  buildAutomaton,
  findMatches,
  resolveOverlaps,
  computeExclusionZones,
  filterMatchesByExclusions,
} from './autolink'
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import { eq } from 'drizzle-orm'
import { entities } from '../db/schema/entities'
import { entityNicknames } from '../db/schema/entity-nicknames'

export interface AutolinkContext {
  automaton: ReturnType<typeof buildAutomaton>
  slugMap: Map<string, string>
  typeMap: Map<string, string>
}

/**
 * Query every entity (plus its nicknames) in a campaign and build the automaton once.
 *
 * Split out of `autoLinkContent` so a caller rendering several content fields from the same
 * campaign in one request (e.g. an arc description and each of its chapters' descriptions)
 * can build this once and reuse it, instead of re-querying and rebuilding per field — the cost
 * that made `GET /api/campaigns/:id/arcs` measurably slower once it started auto-linking.
 */
export function buildAutolinkContext(
  campaignId: string,
  db: BetterSQLite3Database,
): AutolinkContext {
  const allEntities = db
    .select({
      id: entities.id,
      name: entities.name,
      slug: entities.slug,
      type: entities.type,
    })
    .from(entities)
    .where(eq(entities.campaignId, campaignId))
    .all()

  // One batch query for the whole campaign, not one per entity.
  const nicknameRows = db
    .select({ entityId: entityNicknames.entityId, nickname: entityNicknames.nickname })
    .from(entityNicknames)
    .innerJoin(entities, eq(entityNicknames.entityId, entities.id))
    .where(eq(entities.campaignId, campaignId))
    .all()
  const aliasesByEntity = new Map<string, string[]>()
  for (const row of nicknameRows) {
    const list = aliasesByEntity.get(row.entityId)
    if (list) list.push(row.nickname)
    else aliasesByEntity.set(row.entityId, [row.nickname])
  }

  const automaton = buildAutomaton(
    allEntities.map((e) => ({
      id: e.id,
      name: e.name,
      aliases: aliasesByEntity.get(e.id) ?? [],
    })),
  )

  return {
    automaton,
    slugMap: new Map(allEntities.map((e) => [e.id, e.slug])),
    typeMap: new Map(allEntities.map((e) => [e.id, e.type])),
  }
}

/**
 * Apply an already-built `AutolinkContext` to one piece of content. See `buildAutolinkContext`
 * for why this is split out — this half has no DB access, so it's cheap to call many times.
 */
export function applyAutolink(
  content: string,
  currentEntityId: string | null,
  context: AutolinkContext,
): string {
  if (!content.trim()) return content

  const exclusions = computeExclusionZones(content)
  const rawMatches = findMatches(content, context.automaton)
  const filtered = filterMatchesByExclusions(rawMatches, exclusions)
  let matches = resolveOverlaps(filtered)

  // Exclude self-mentions
  if (currentEntityId) {
    matches = matches.filter((m) => m.entityId !== currentEntityId)
  }

  if (matches.length === 0) return content

  // Replace matches from end to start (so offsets stay valid)
  let result = content
  const sorted = [...matches].sort((a, b) => b.start - a.start)
  for (const match of sorted) {
    const slug = context.slugMap.get(match.entityId)
    if (!slug) continue
    const type = context.typeMap.get(match.entityId)
    const before = result.substring(0, match.start)
    const after = result.substring(match.end)
    const escapedName = match.matchedText.replace(/"/g, '&quot;')
    const typeAttr = type ? ` type="${type}"` : ''
    result = `${before}:entity-link{slug="${slug}" name="${escapedName}"${typeAttr}}${after}`
  }

  return result
}

/**
 * Transform markdown content by replacing entity name mentions
 * with :entity-link{slug="..."} MDC syntax at render time.
 * Source files are never modified.
 *
 * Convenience wrapper around `buildAutolinkContext` + `applyAutolink` for the common case of
 * rendering a single content field. Prefer the split functions when rendering several fields
 * from the same campaign in one request.
 */
export function autoLinkContent(
  content: string,
  campaignId: string,
  currentEntityId: string | null,
  db: BetterSQLite3Database,
): string {
  if (!content.trim()) return content
  const context = buildAutolinkContext(campaignId, db)
  return applyAutolink(content, currentEntityId, context)
}
