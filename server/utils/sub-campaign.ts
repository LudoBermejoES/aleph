import { and, eq } from 'drizzle-orm'
import { createError } from 'h3'
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import { subCampaigns } from '../db/schema/sessions'

/**
 * Resolve a sub-campaign slug to its id, scoped to the campaign. `sub_campaigns` has a
 * unique `(campaignId, slug)` constraint (unlike `arcs`), so there is no ambiguous case.
 */
export function resolveSubCampaignSlug(
  db: BetterSQLite3Database,
  campaignId: string,
  slug: string,
): string {
  const match = db
    .select({ id: subCampaigns.id })
    .from(subCampaigns)
    .where(and(eq(subCampaigns.campaignId, campaignId), eq(subCampaigns.slug, slug)))
    .get()
  if (!match) {
    throw createError({ statusCode: 404, message: `Sub-campaign "${slug}" not found` })
  }
  return match.id
}

/** The campaign's single `isDefault: true` sub-campaign, seeded when the campaign was created. */
export function getDefaultSubCampaignId(db: BetterSQLite3Database, campaignId: string): string {
  const match = db
    .select({ id: subCampaigns.id })
    .from(subCampaigns)
    .where(and(eq(subCampaigns.campaignId, campaignId), eq(subCampaigns.isDefault, true)))
    .get()
  if (!match) {
    throw createError({
      statusCode: 500,
      message: 'Campaign has no default sub-campaign',
    })
  }
  return match.id
}

/**
 * Resolve `subCampaignSlug` for a create operation: an explicit slug resolves normally
 * (404 if unknown), omitting it falls back to the campaign's default sub-campaign.
 */
export function resolveSubCampaignIdForCreate(
  db: BetterSQLite3Database,
  campaignId: string,
  subCampaignSlug: string | undefined,
): string {
  if (subCampaignSlug) return resolveSubCampaignSlug(db, campaignId, subCampaignSlug)
  return getDefaultSubCampaignId(db, campaignId)
}
