## Why

The secrets system (DM-only notes, secret content blocks, reveal toggles, preview-as-role) is fully built but only wired into the generic entity page (`/entities/[slug]`). Nobody navigates there — users browse characters, locations, sessions, quests, and arcs via their dedicated pages, which have zero secret functionality. A DM writing secret notes on a character has to navigate to `/entities/<slug>` instead of `/characters/<slug>` to see them. This makes the entire secrets feature effectively invisible.

## What Changes

- **Extract `useSecretReveals` composable** from the inline reveal-button injection logic in the entity page — reusable across all detail pages
- **Add secret UI to 5 detail pages**: characters, locations, sessions, quests, arcs
  - `EntitySecretNotes` component at the bottom (DM/Co-DM only)
  - `EntityPreviewRoleSwitcher` at the top (DM/Co-DM only)
  - Secret block reveal buttons injected into rendered content
- **Skip organizations** — they don't have entity backing (`entityId`), so the secret notes API (`/entities/:slug/secret-notes`) doesn't apply. Adding entity backing to orgs is a separate, larger change.
- **Role detection**: each page needs to know if the current user is DM/Co-DM to conditionally show secret UI

## Capabilities

### New Capabilities

- `secrets-all-pages`: Secret notes, preview role switching, and secret block reveals on all entity-backed detail pages (characters, locations, sessions, quests, arcs)

### Modified Capabilities

## Impact

- **New composable**: `app/composables/useSecretReveals.ts` — extracted from entity page
- **Modified pages**:
  - `app/pages/campaigns/[id]/characters/[slug]/index.vue`
  - `app/pages/campaigns/[id]/locations/[slug]/index.vue`
  - `app/pages/campaigns/[id]/sessions/[slug]/index.vue`
  - `app/pages/campaigns/[id]/quests/[slug]/index.vue`
  - `app/pages/campaigns/[id]/arcs/[slug]/index.vue`
- **Modified**: `app/pages/campaigns/[id]/entities/[slug]/index.vue` — refactored to use new composable
- **No API changes** — all backend endpoints already exist
- **No schema changes**
- **No CLI impact**
