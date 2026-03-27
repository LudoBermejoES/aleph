## Context

`app/layouts/default.vue` builds `campaignLinks` as a flat array of `{to, label}` objects rendered with a single `v-for`. There is no grouping, no section headers, and no collapse logic. The sidebar already scrolls (`overflow-auto`), so adding more items just makes the problem worse.

## Goals / Non-Goals

**Goals:** Group the 15 links into 4 collapsible sections. Persist open/closed state across navigation. No behavior change beyond visual grouping.

**Non-Goals:** Icons per link, drag-to-reorder, user-customisable groupings, animated transitions.

## Decisions

**Group structure (hardcoded, not configurable)**
- `world`: Wiki, Characters, Organizations, Locations, Maps
- `story`: Sessions, Quests, Calendars
- `economy`: Items, Shops, Inventories, Currencies, Transactions
- `campaign`: Graph, Members

Rationale: these groupings reflect natural TTRPG domain boundaries. Making them configurable would add complexity with minimal benefit for the current user base.

**`campaignLinkGroups` replaces `campaignLinks`** — change the computed to return `{ id, label, links[] }[]` instead of a flat array. Update the template to iterate groups, render a toggle button for each, and conditionally render its links.

**Collapsed state in `localStorage`** via a `ref<Set<string>>` initialized from `localStorage.getItem('sidebarCollapsed')`. Toggling a group updates the Set and writes back to localStorage. No Pinia store needed — this is purely UI state.

**Active group stays open** — if a group contains the current route, force it open regardless of localStorage. Prevents the user from landing on a page whose nav section is collapsed.

## Risks / Trade-offs

[Low] localStorage key collision if multiple campaigns open in same browser — mitigated by keying collapse state globally (group id only, not per-campaign), since groups are the same for all campaigns.

[Low] SSR hydration mismatch on localStorage read — mitigated by reading localStorage only on `onMounted` (client-only), defaulting all groups to open during SSR.
