## Context

The secrets system has three frontend components:

1. **EntitySecretNotes** — collapsible DM-only notes section (textarea, saves to `/entities/:slug/secret-notes`)
2. **EntityPreviewRoleSwitcher** — dropdown to preview content as different roles
3. **Secret reveal buttons** — dynamically injected into rendered content blocks that have `data-secret-id` attributes

All three are currently only used in `entities/[slug]/index.vue`. The reveal button injection is ~20 lines of inline JS that queries the DOM after content renders, checks revealed state via API, and injects toggle buttons.

Entity-backed types: characters (`characters.entityId`), locations (ARE entities with `type='location'`), sessions (`gameSessions.entityId`), quests (`quests.entityId`), arcs (`arcs.entityId`). Organizations are NOT entity-backed.

Each detail page needs the entity slug to call the secret APIs. Characters/sessions/quests/arcs have their own slugs that match their entity slugs. Locations are directly entities.

## Goals / Non-Goals

**Goals:**

- Secret notes visible on character, location, session, quest, and arc detail pages (DM/Co-DM only)
- Preview role switcher on those pages
- Secret block reveal buttons in rendered content on those pages
- Extract reusable composable for the reveal logic
- Refactor entity page to use the same composable

**Non-Goals:**

- Adding secret support to organizations (no entityId — separate change)
- Changing the secret block markdown syntax
- Modifying the secret notes API
- Adding secrets to list/index pages

## Decisions

### Decision 1: Extract useSecretReveals composable

**Chosen:** Create `app/composables/useSecretReveals.ts` that accepts `(contentRef, campaignId, entitySlug, isDm)` and handles:

- Fetching revealed block IDs from API
- Watching contentRef for changes and injecting reveal/unreveal buttons
- Calling POST/DELETE to toggle reveals

The entity page's inline logic (~20 lines) is extracted here and reused by all pages.

### Decision 2: Each page resolves its own entity slug

**Chosen:** Each detail page is responsible for knowing its entity slug:

- **Characters**: fetch character data → `character.slug` (entity slug matches)
- **Locations**: the location IS the entity, slug is the same
- **Sessions**: fetch session data → use session slug (entity slug matches)
- **Quests**: fetch quest data → use quest slug
- **Arcs**: fetch arc data → use arc slug

Pages already fetch their data on mount. The entity slug is passed to the composable and secret components.

### Decision 3: Detect DM role from campaign data

**Chosen:** Most detail pages already fetch campaign role for edit permissions. Use the same role check (`role === 'dm' || role === 'co_dm'`) to conditionally render secret UI. Pages that don't currently fetch role will add a simple campaign API call.

### Decision 4: Skip organizations

**Chosen:** Organizations don't have `entityId`, so the secrets API (`/entities/:slug/...`) doesn't work for them. Adding entity backing would require a schema migration and changes to all org CRUD. That's a separate change. For now, orgs get no secret support.

## Risks / Trade-offs

- **Content rendering differences** — Some pages render content via `MarkdownRenderer`, others use custom rendering. The reveal button injection works on any HTML with `[data-secret-id]` attributes, so it should work regardless of renderer.
- **Entity slug mismatch** — If a character's entity slug differs from the character slug, the API calls will fail. In practice they always match because entity creation uses the same slugify logic.
- **Performance** — Adding a secret notes fetch + revealed blocks fetch to each page load adds 2 API calls for DM users. Negligible.
