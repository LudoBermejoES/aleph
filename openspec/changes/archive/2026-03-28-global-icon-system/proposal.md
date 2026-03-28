## Why

The app has no icons anywhere — sidebar links, dashboard cards, page headers, nav groups, and action buttons are all plain text. `lucide-vue-next` is already installed but unused. Icons are essential for quick visual scanning in a content-heavy TTRPG tool where users navigate between many different areas constantly.

## What Changes

- Add emoji-style icons to every sidebar navigation link (all campaigns, dashboard, wiki, characters, organizations, locations, maps, sessions, quests, calendars, items, shops, inventories, currencies, transactions, graph, members)
- Add icons to the collapsible nav group headers (World, Story, Economy, Campaign)
- Add icons to the campaign dashboard cards (the `[id]/index.vue` grid of links)
- Add icons to common action buttons across all pages (New, Save, Delete, Edit, Back, Sign Out, Settings)
- Add icons to status badges (character status: alive/dead/missing; quest status; session status; organization status/type)
- Add icons to the auth layout sign-in/register actions
- All icons come from `lucide-vue-next` — no new dependency needed

## Capabilities

### New Capabilities
- `icon-system`: A centralized icon mapping utility (`app/utils/icons.ts`) that exports named icon components for every domain concept (entity types, statuses, nav areas, actions) — consumed by layouts, pages, and components

### Modified Capabilities
- `sidebar-nav-groups`: Sidebar nav links and group headers now render an icon alongside the label
- `worldbuilding-wiki`: Entity list/detail pages now show entity-type icons
- `character-management`: Character list badges (status, type) now show icons
- `session-management`: Session status badges now show icons
- `organization-management`: Organization type/status badges now show icons

## Impact

- **app/layouts/default.vue** — sidebar links and group headers
- **app/layouts/auth.vue** — auth page actions
- **app/pages/campaigns/[id]/index.vue** — dashboard cards
- **app/pages/campaigns/[id]/characters/index.vue** — status/type badges
- **app/pages/campaigns/[id]/sessions/index.vue** — status badges
- **app/pages/campaigns/[id]/quests/index.vue** — status badges
- **app/pages/campaigns/[id]/organizations/index.vue** — type/status badges
- **app/utils/icons.ts** (new) — central icon export map
- **No server API changes** — pure frontend, no CLI impact
- **No new dependencies** — `lucide-vue-next ^1.0.0` already in package.json
