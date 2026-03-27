## Why

The campaign sidebar currently has 15 flat links with no visual separation. At this scale, the list is hard to scan — users must read every label to find what they want. Grouping related items under collapsible section headers would reduce cognitive load and make the sidebar usable at a glance.

## What Changes

Group the 15 campaign nav links into 4 labelled sections:

- **World** — Wiki, Characters, Organizations, Locations, Maps
- **Story** — Sessions, Quests, Calendars
- **Economy** — Items, Shops, Inventories, Currencies, Transactions
- **Campaign** — Graph, Members

Each section renders as a collapsible group with a small uppercase label. Groups are expanded by default. The collapsed/expanded state per group is persisted in `localStorage` so it survives navigation.

## Capabilities

### New Capabilities
- `sidebar-nav-groups`: Collapsible grouped navigation sections in the campaign sidebar

### Modified Capabilities

## Impact

- `app/layouts/default.vue` — replace flat `campaignLinks` list with grouped structure and collapsible section rendering
- `i18n/locales/en.json`, `i18n/locales/es.json` — add group label keys
- No server changes, no API changes
