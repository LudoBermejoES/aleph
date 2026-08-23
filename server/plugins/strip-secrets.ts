import type { H3Event } from 'h3'
import { stripSecretBlocksDeep } from '../services/content'
import { getEffectiveRole } from '../utils/effective-role'
import { hasMinRole } from '../utils/permissions'

/**
 * The single point every campaign-scoped response passes through before it is serialised.
 *
 * `stripSecretBlocks` has always been correct; what was broken is that calling it was
 * OPTIONAL. It had to be spelled out per field, and across ~90 endpoints most fields were
 * never wrapped: a character's `backstory`, `history` and `currentStatus` (the reported
 * leak), a session's whole `logContent`, every chapter/timeline/sub-campaign description,
 * `boardSummary` on the entity list and the graph, entity frontmatter `fields`. Each of those
 * is the same mistake — "I forgot to wrap it" — and adding one more wrapper per field would
 * only reset the clock until the next field.
 *
 * Hooking `beforeResponse` inverts the default. Nitro hands us the handler's return value
 * before serialisation (`h3`'s `_response.body`, which `handleHandlerResponse` then writes),
 * so mutating it here filters every string in the payload no matter which handler produced
 * it or when it was written. A field added tomorrow is filtered because its author did
 * nothing, which is the only version of this that stays fixed.
 *
 * Deliberate properties:
 *
 *  - **Fail-closed.** Scoped by PATH, not by whether a role happens to be in context. A
 *    request under `/api/campaigns/:id/` with no resolved membership is filtered as
 *    `visitor`, the harshest role, rather than skipped.
 *  - **DM/co-DM untouched.** `getEffectiveRole` returns their real role and
 *    `stripSecretBlocksDeep` returns early for anyone at `co_dm`+, so they still receive the
 *    blocks with their `:::secret{...}` wrappers intact — which is what the reader UI needs
 *    to render them as secrets rather than as ordinary prose.
 *  - **`preview_as` honoured**, via the same helper the handlers use. A DM previewing as a
 *    player is filtered like a player, consistently across every field.
 *  - **Reveals survive.** This pass cannot know an entity's `revealedBlockIds`, but it does
 *    not need to: the handlers that support reveals (`entities/[slug]/render`) strip FIRST,
 *    and a revealed block comes out of that pass with its wrapper already removed — so there
 *    is nothing left here for a second pass to re-hide. Stripping is idempotent, so running
 *    over already-filtered content is a no-op.
 *
 * What this does NOT cover, on purpose: the FTS5 search index, which stores raw markdown in
 * `entities_fts.body` and returns a 30-token snippet window that usually contains no
 * `:::secret` fence for this pass to recognise. That needs an index-side fix, not a
 * response-side one.
 */
/**
 * `/api/campaigns/:id` and everything under it. `:id` is captured so `/api/campaigns/import`
 * — a top-level action `02.campaign.ts` skips, with no campaign and therefore no role — is
 * excluded rather than filtered as a visitor.
 *
 * `/api/campaigns` itself (the list) is deliberately out of scope: it spans campaigns, so
 * there is no single role to filter by — each ROW carries its own. Filtering a campaign's
 * `description` there needs a per-row decision inside that handler, not a request-wide one.
 */
const CAMPAIGN_SCOPED = /^\/api\/campaigns\/([^/]+)(?:\/|$)/
const NOT_A_CAMPAIGN_ID = new Set(['import'])

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('beforeResponse', (event: H3Event, response: { body?: unknown }) => {
    if (response?.body === undefined || response.body === null) return

    const path = getRequestURL(event).pathname
    const match = CAMPAIGN_SCOPED.exec(path)
    if (!match || NOT_A_CAMPAIGN_ID.has(match[1]!)) return

    const role = getEffectiveRole(event)
    if (hasMinRole(role, 'co_dm')) return

    response.body = stripSecretBlocksDeep(response.body, role)
  })
})
