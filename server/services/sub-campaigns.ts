import { randomUUID } from 'crypto'
import { and, asc, eq, inArray, ne } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import { arcs, gameSessions, subCampaigns } from '../db/schema/sessions'

/**
 * Create the mandatory default sub-campaign for a campaign.
 * Call when a campaign is first created, alongside entity-type/relation-type seeding.
 */
export function createDefaultSubCampaign(db: BetterSQLite3Database, campaignId: string): string {
  const id = randomUUID()
  const now = new Date()
  db.insert(subCampaigns)
    .values({
      id,
      campaignId,
      name: 'General',
      slug: 'general',
      description: null,
      imageUrl: null,
      sortOrder: 0,
      isDefault: true,
      createdAt: now,
      updatedAt: now,
    })
    .run()
  return id
}

/**
 * Sessions whose arc belongs to a different sub-campaign than the session itself.
 *
 * Lives here rather than inside the endpoint so it can be unit-tested against a seeded database:
 * once the 422 and the arc-move cascade are in place, **no API route can manufacture this state
 * any more**, so an integration test cannot set up the very thing the audit exists to find. That
 * is the point of the audit — it is for rows that predate the rule, or that a future bug creates.
 */
export function findIncoherentSessions(db: BetterSQLite3Database, campaignId: string) {
  const sessionSub = alias(subCampaigns, 'session_sub')
  const arcSub = alias(subCampaigns, 'arc_sub')

  return (
    db
      .select({
        sessionSlug: gameSessions.slug,
        sessionTitle: gameSessions.title,
        sessionNumber: gameSessions.sessionNumber,
        arcSlug: arcs.slug,
        arcName: arcs.name,
        sessionSubCampaignSlug: sessionSub.slug,
        sessionSubCampaignName: sessionSub.name,
        arcSubCampaignSlug: arcSub.slug,
        arcSubCampaignName: arcSub.name,
      })
      .from(gameSessions)
      // Inner: a session with no arc has nothing to disagree with.
      .innerJoin(arcs, eq(gameSessions.arcId, arcs.id))
      .innerJoin(sessionSub, eq(gameSessions.subCampaignId, sessionSub.id))
      .innerJoin(arcSub, eq(arcs.subCampaignId, arcSub.id))
      .where(
        and(
          eq(gameSessions.campaignId, campaignId),
          ne(gameSessions.subCampaignId, arcs.subCampaignId),
        ),
      )
      .orderBy(asc(gameSessions.sessionNumber))
      .all()
  )
}

/**
 * Each incoherent session adopts its ARC's sub-campaign — the arc wins because it is the
 * organizing unit, the same reason moving an arc carries its sessions.
 *
 * Grouped by destination so this is one UPDATE per sub-campaign rather than one per session, and
 * wrapped in a transaction: a half-applied repair leaves a state neither the audit nor the
 * Narrator could reason about.
 */
export function repairIncoherentSessions(db: BetterSQLite3Database, campaignId: string) {
  const targets = db
    .select({ id: gameSessions.id, slug: gameSessions.slug, arcSubCampaignId: arcs.subCampaignId })
    .from(gameSessions)
    .innerJoin(arcs, eq(gameSessions.arcId, arcs.id))
    .where(
      and(
        eq(gameSessions.campaignId, campaignId),
        ne(gameSessions.subCampaignId, arcs.subCampaignId),
      ),
    )
    .all()

  if (targets.length === 0) return { repaired: [] as string[], total: 0 }

  const byDestination = new Map<string, string[]>()
  for (const t of targets) {
    const list = byDestination.get(t.arcSubCampaignId) ?? []
    list.push(t.id)
    byDestination.set(t.arcSubCampaignId, list)
  }

  db.transaction((tx) => {
    for (const [subCampaignId, ids] of byDestination) {
      tx.update(gameSessions)
        .set({ subCampaignId, updatedAt: new Date() })
        .where(inArray(gameSessions.id, ids))
        .run()
    }
  })

  return { repaired: targets.map((t) => t.slug), total: targets.length }
}
