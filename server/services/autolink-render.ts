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

/**
 * Transform markdown content by replacing entity name mentions
 * with :entity-link{slug="..."} MDC syntax at render time.
 * Source files are never modified.
 */
export function autoLinkContent(
  content: string,
  campaignId: string,
  currentEntityId: string | null,
  db: BetterSQLite3Database,
): string {
  if (!content.trim()) return content

  // Get all entities in campaign
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

  if (allEntities.length === 0) return content

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

  const exclusions = computeExclusionZones(content)
  const rawMatches = findMatches(content, automaton)
  const filtered = filterMatchesByExclusions(rawMatches, exclusions)
  let matches = resolveOverlaps(filtered)

  // Exclude self-mentions
  if (currentEntityId) {
    matches = matches.filter((m) => m.entityId !== currentEntityId)
  }

  if (matches.length === 0) return content

  // Build slug and type lookup
  const slugMap = new Map(allEntities.map((e) => [e.id, e.slug]))
  const typeMap = new Map(allEntities.map((e) => [e.id, e.type]))

  // Replace matches from end to start (so offsets stay valid)
  let result = content
  const sorted = [...matches].sort((a, b) => b.start - a.start)
  for (const match of sorted) {
    const slug = slugMap.get(match.entityId)
    if (!slug) continue
    const type = typeMap.get(match.entityId)
    const before = result.substring(0, match.start)
    const after = result.substring(match.end)
    const escapedName = match.matchedText.replace(/"/g, '&quot;')
    const typeAttr = type ? ` type="${type}"` : ''
    result = `${before}:entity-link{slug="${slug}" name="${escapedName}"${typeAttr}}${after}`
  }

  return result
}
