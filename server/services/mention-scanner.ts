import { randomUUID } from 'crypto'
import { eq, and } from 'drizzle-orm'
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import { entities } from '../db/schema/entities'
import { entityNicknames } from '../db/schema/entity-nicknames'
import { entityMentions } from '../db/schema/mentions'
import {
  buildAutomaton,
  findMatches,
  resolveOverlaps,
  computeExclusionZones,
  filterMatchesByExclusions,
} from './autolink'
import { readEntityFile } from './content'
import { logger } from '../utils/logger'

/**
 * Scan all campaign markdown files for mentions of entity names.
 * Updates the entity_mentions table.
 */
export async function scanCampaignMentions(
  db: BetterSQLite3Database,
  campaignId: string,
): Promise<{ scanned: number; mentionsFound: number }> {
  // Get all entities in campaign
  const allEntities = db
    .select({
      id: entities.id,
      name: entities.name,
      filePath: entities.filePath,
    })
    .from(entities)
    .where(eq(entities.campaignId, campaignId))
    .all()

  if (allEntities.length === 0) return { scanned: 0, mentionsFound: 0 }

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

  // Build automaton from entity names and nicknames
  const automaton = buildAutomaton(
    allEntities.map((e) => ({
      id: e.id,
      name: e.name,
      aliases: aliasesByEntity.get(e.id) ?? [],
    })),
  )

  let mentionsFound = 0

  // Scan each entity's markdown content
  for (const entity of allEntities) {
    try {
      const file = await readEntityFile(entity.filePath)
      const text = file.content

      const exclusions = computeExclusionZones(text)
      const rawMatches = findMatches(text, automaton)
      const filtered = filterMatchesByExclusions(rawMatches, exclusions)
      const matches = resolveOverlaps(filtered)

      // Remove self-mentions
      const otherMentions = matches.filter((m) => m.entityId !== entity.id)

      // Count mentions per target entity
      const countMap = new Map<string, number>()
      for (const m of otherMentions) {
        countMap.set(m.entityId, (countMap.get(m.entityId) || 0) + 1)
      }

      // Upsert mention records
      for (const [targetId, count] of countMap) {
        const existing = db
          .select()
          .from(entityMentions)
          .where(
            and(
              eq(entityMentions.sourceEntityId, entity.id),
              eq(entityMentions.targetEntityId, targetId),
            ),
          )
          .get()

        if (existing) {
          db.update(entityMentions).set({ count }).where(eq(entityMentions.id, existing.id)).run()
        } else {
          db.insert(entityMentions)
            .values({
              id: randomUUID(),
              campaignId,
              sourceEntityId: entity.id,
              targetEntityId: targetId,
              count,
              createdAt: new Date(),
            })
            .run()
        }
        mentionsFound++
      }
    } catch {
      // File might not exist yet
    }
  }

  logger.debug('Campaign mentions scanned', {
    campaignId,
    scanned: allEntities.length,
    mentionsFound,
  })
  return { scanned: allEntities.length, mentionsFound }
}
