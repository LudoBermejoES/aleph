## Why

Aleph's visibility system (`entities.visibility`: `public`/`members`/`editors`/`dm_only`/`private`/`specific_users`, enforced via `VISIBILITY_MIN_ROLE`) exists specifically so a DM can hide plot-sensitive content from players who haven't discovered it yet in-fiction. It works correctly for character and location _detail_ pages. It does not work for organizations at all, and it is inconsistently applied everywhere else a player can encounter entities without opening their detail page. Confirmed by direct codebase investigation (not assumed):

- Organizations have no visibility field anywhere — not in the create/edit UI, not in the API schemas, not settable at all. `createOrganizationWithEntity` hardcodes `visibility: 'members'`. A DM cannot hide a secret cabal or hostile faction from players even though the underlying column and role system already support exactly this for characters.
- The organization list and detail endpoints apply no visibility/role filtering regardless, so even a manually-set restrictive visibility would leak.
- The character _list_ endpoint (unlike its own detail endpoint) applies no visibility filtering at all — `dm_only`/`private` characters' names, portraits, and status already leak to `player`/`visitor` roles today, in production, independent of anything else in this proposal.
- Diagram generation (both the tldraw auto-generated campaign diagrams and the relationship graph) ignores visibility entirely — every character, organization, and location is included as a full node (name, portrait, summary) regardless of the viewer's role. A player looking at a relationship graph can see the name and portrait of a dm_only villain who hasn't been introduced yet.

This defeats the actual purpose of the visibility feature: a DM who believes marking something `dm_only` hides it from players is wrong for organizations, character lists, and every diagram/graph view.

## What Changes

- Add a `visibility` field to organizations: same enum as characters/locations, settable via the org create/edit forms and API (`POST`/`PUT /api/campaigns/[id]/organizations`), stored on the org's mirror `entities` row (matching the existing character/location pattern — no new column, no migration).
- Enforce visibility on organization list and detail reads (`GET /api/campaigns/[id]/organizations` and `[slug]`), scoped by the requester's campaign role, matching how `entity-permissions` already governs character/location detail reads.
- Fix the character list endpoint (`GET /api/campaigns/[id]/characters`) to apply the same visibility filter its own detail endpoint and the location/entity list endpoints already use (`buildVisibilityFilter`) — this is a same-shaped bug fix, not new capability, but closes a real information leak.
- Filter diagram generation and the relationship graph so entities (characters, organizations, locations) whose visibility the requesting viewer's role doesn't meet are excluded as nodes — not just hidden after the fact, but never included in generated shapes/snapshots or graph payloads in the first place, for the role that generates/fetches them.

**Not BREAKING**: no schema changes, no removed capability. Existing organizations default to `members` visibility (today's implicit hardcoded behavior), so nothing already-visible becomes hidden by default.

## Capabilities

### New Capabilities

(none — this extends existing capabilities' requirements)

### Modified Capabilities

- `entity-permissions`: extend existing visibility-enforcement requirements to cover organizations (currently only entities/characters/locations are specified) and to explicitly require the character list endpoint to filter by visibility (closing the gap where the spec's assumption that list endpoints are "already correct" doesn't hold for characters).
- `organization-management`: add a requirement that organizations have a settable `visibility` field with the same semantics as characters/locations, enforced on read.
- `relationship-graph`: add a requirement that graph/diagram node inclusion (characters, organizations, locations) respects the requesting viewer's role against each entity's visibility, alongside the existing per-connection visibility requirement.

## Impact

- **Server**: `server/api/campaigns/[id]/organizations/index.post.ts`, `[slug]/index.put.ts`, `index.get.ts`, `[slug]/index.get.ts`; `server/services/organizations.ts` (`createOrganizationWithEntity`, `updateOrganizationWithEntity`); `server/api/campaigns/[id]/characters/index.get.ts`; `server/utils/diagram-generator.ts` (`generateEntityGraph`, `generateFactionWeb`); `server/api/campaigns/[id]/diagrams/generate.post.ts`; `server/services/graph-builder.ts`; `server/utils/permissions.ts` (`VISIBILITY_MIN_ROLE`, `buildVisibilityFilter` — reused, not changed).
- **Frontend**: `app/pages/campaigns/[id]/organizations/new.vue` and `[slug]/edit.vue` (add visibility select, matching `CharacterForm.vue`/`LocationForm.vue`'s existing pattern).
- **CLI**: `cli/src/commands/organization.js` (if it exposes create/edit flags) needs a `--visibility` option added to match `character`/`location` commands, and `docs/claude-skill.md` / `.claude/skills/aleph-cli/SKILL.md` need the corresponding doc update per project convention — to be confirmed during design/tasks by checking the CLI's current organization command surface.
- **No new dependencies, no data migration** — reuses the existing `entities.visibility` column and `VISIBILITY_MIN_ROLE` role model end-to-end.
