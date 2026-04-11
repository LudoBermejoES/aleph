## Why

GMs can create and edit entities, characters, locations, maps, and organizations but cannot delete them from the UI — the delete APIs already exist but there are no delete buttons on detail pages. This forces GMs to use the CLI or API directly to remove content, which is a significant UX gap for a tool aimed at non-technical users.

## What Changes

- Add a **Delete** button to the entity (wiki page) detail page
- Add a **Delete** button to the character detail page
- Add a **Delete** button to the map detail page
- Add a **Delete** button to the organization detail page
- Location detail page already has delete — no change needed
- Each delete action requires confirmation (browser confirm dialog) before proceeding
- After deletion the user is redirected to the relevant list page
- Only DM and co-DM roles can see and use delete buttons (editor and below cannot)

## Capabilities

### New Capabilities

- `entity-delete-ui`: Delete buttons on entity, character, map, and organization detail pages with role-gating and confirmation

### Modified Capabilities

- `character-management`: character detail page gains a delete action
- `organization-management`: organization detail page gains a delete action
- `maps`: map detail page gains a delete action
- `worldbuilding-wiki`: entity detail page gains a delete action

## Impact

- `app/pages/campaigns/[id]/entities/[slug]/index.vue` — add delete button + handler
- `app/pages/campaigns/[id]/characters/[slug]/index.vue` — add delete button + handler
- `app/pages/campaigns/[id]/maps/[slug]/index.vue` — add delete button + handler
- `app/pages/campaigns/[id]/organizations/[slug]/index.vue` — add delete button + handler
- All pages already use `useCampaignApi()` which exposes the relevant delete methods
- `app/composables/useCampaignApi.ts` — verify delete methods exist for all four entity types
- aleph-cli: no impact — delete commands already exist in the CLI
- i18n: confirmation message keys needed for entity and character deletes (location and org already have them)
