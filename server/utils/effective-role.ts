import type { H3Event } from 'h3'
import { hasMinRole } from './permissions'
import type { CampaignRole } from './permissions'

const VALID_ROLES: CampaignRole[] = ['dm', 'co_dm', 'editor', 'player', 'visitor']

/**
 * The role a campaign-scoped response should be rendered FOR, as opposed to the role the
 * caller actually holds.
 *
 * They differ only for `?preview_as=`, the DM's "show me this page as a player would see it"
 * switch. That override is gated on the caller genuinely being `co_dm`+ — a player passing
 * `preview_as=dm` gets their own role back, which is the whole point of computing it here
 * rather than trusting the query string.
 *
 * This logic was copy-pasted in seven handlers before it lived here, which is a poor place
 * for a security decision to be duplicated: the response-wide secret filter has to arrive at
 * exactly the same answer the handler did, or a DM previewing as a player would see the
 * blocks stripped from one field and intact in the next.
 *
 * Defaults to `visitor` — the least-privileged role — when no membership was resolved, so a
 * request that somehow reaches a handler without `02.campaign.ts` having run is filtered
 * hardest rather than not at all.
 */
export function getEffectiveRole(event: H3Event): CampaignRole {
  const actualRole = (event.context.campaignRole || 'visitor') as CampaignRole

  const previewAs = getQuery(event).preview_as as string | undefined
  if (
    previewAs &&
    hasMinRole(actualRole, 'co_dm') &&
    VALID_ROLES.includes(previewAs as CampaignRole)
  ) {
    return previewAs as CampaignRole
  }
  return actualRole
}
