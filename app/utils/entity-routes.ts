/**
 * Entity types with their own dedicated detail page (as opposed to the
 * generic /entities/:slug view). Keep in sync with server/services/entity-types.ts
 * and the route segments actually present under app/pages/campaigns/[id]/.
 */
const TYPE_ROUTE_SEGMENTS: Record<string, string> = {
  character: 'characters',
  location: 'locations',
  organization: 'organizations',
  quest: 'quests',
  session: 'sessions',
  arc: 'arcs',
}

/**
 * Build the detail-page path for an entity, routing to its type-specific page
 * (e.g. /characters/:slug, /sessions/:slug) when one exists, falling back to
 * the generic /entities/:slug view otherwise.
 */
export function entityDetailPath(
  campaignId: string,
  type: string | undefined,
  slug: string,
): string {
  const segment = type ? TYPE_ROUTE_SEGMENTS[type] : undefined
  return `/campaigns/${campaignId}/${segment ?? 'entities'}/${slug}`
}
