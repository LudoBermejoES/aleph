# Proposal: Secrets System

## Why

Aleph already supports whole-entity visibility levels and `:::secret{.dm}` blocks that strip DM-only content from player views. However, the current system is binary -- a secret block is either visible or stripped entirely, with no way to selectively reveal content during a session or for DMs to preview what players actually see.

Competitors (Kanka, LegendKeeper, World Anvil) have demonstrated that DMs need finer-grained control: per-section visibility within an entity, a "preview as player" mode to verify the player experience, and progressive reveal to dramatically uncover information during live sessions. Without these, DMs either over-share (putting secrets in plain text) or under-share (moving everything to dm_only entities that are harder to organize).

## What Changes

1. **Extend SecretBlock with reveal state** -- Add an optional `id` attribute to secret blocks and a `secret_reveals` table tracking which blocks have been revealed, to whom, and when. The `stripSecretBlocks` function gains reveal-awareness so revealed blocks pass through to the rendered content.

2. **Preview-as-player mode** -- A role-switcher UI in the entity viewer that lets DMs render the page as if they were a player/visitor/specific user, without navigating away. Implemented as a query parameter (`?preview_as=player`) that overrides the effective role for content stripping only (not for edit permissions).

3. **Entity-level secret notes** -- A `secret_notes` markdown field on entities visible only to DM/Co-DM, stored in a separate `entity_secret_notes` table. Displayed in a collapsible panel on the entity view page. This keeps DM planning notes attached to the entity without embedding them in the main content.

4. **Progressive reveal via WebSocket** -- API endpoints to reveal/unreveal secret blocks, broadcasting `secret:reveal` and `secret:unreveal` messages through the existing CrossWS campaign channel so all connected clients update in real time.

## Capabilities

- DM authors a secret block with `:::secret{.dm #ambush-plan}` syntax (new `id` attribute)
- DM opens entity view, toggles "Preview as player" to see exactly what a player sees
- During a session, DM clicks "Reveal" on a secret block; all connected players instantly see the content appear
- DM writes private planning notes in the secret notes panel; players never see the panel or its content
- Existing `:::secret{.dm}` blocks without IDs continue to work exactly as before (backward compatible)
- Revealed blocks persist across page reloads (stored in DB, not just WS ephemeral state)

## Impact

### Files affected

- `server/extensions/secret-block.ts` -- Add `id` attribute to SecretBlock node
- `server/services/content.ts` -- Update `stripSecretBlocks` to check reveal state
- `server/db/schema/` -- New `secret_reveals` and `entity_secret_notes` tables
- `server/db/migrations/` -- New migration
- `server/api/campaigns/[id]/entities/[slug]/` -- New `secrets.post.ts`, `secrets.delete.ts`, `secret-notes.get.ts`, `secret-notes.put.ts` endpoints
- `server/api/campaigns/[id]/entities/[slug]/render.get.ts` -- Integrate reveal-aware stripping and preview-as support
- `server/routes/api/ws.ts` -- Handle `secret:reveal` and `secret:unreveal` message types
- `server/utils/broadcast.ts` -- No changes needed (existing `emitCampaignMessage` suffices)
- `app/components/` -- New `PreviewAsPlayer.vue`, `SecretNotes.vue`, `SecretRevealButton.vue` components
- `app/components/MarkdownEditor.client.vue` -- Update SecretBlock rendering to support IDs
- `server/utils/permissions.ts` -- No structural changes; preview mode reuses existing role checks
- `i18n/locales/en.json`, `i18n/locales/es.json` -- New keys for secrets UI

### CLI impact

- New endpoints for secret reveals and secret notes may warrant CLI commands (e.g., `aleph secrets reveal`, `aleph secrets list`), but this is optional and can be deferred. The core feature is UI-driven.
- `docs/claude-skill.md` and `.claude/skills/aleph-cli/SKILL.md` should be updated if CLI commands are added.

### Dependencies

- Existing `SecretBlock` extension and `stripSecretBlocks` function
- Existing CrossWS broadcast infrastructure (`emitCampaignMessage`)
- Existing entity permissions and visibility system
