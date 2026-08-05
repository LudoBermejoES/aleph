import { randomUUID } from 'crypto'
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import { subCampaigns } from '../db/schema/sessions'

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
